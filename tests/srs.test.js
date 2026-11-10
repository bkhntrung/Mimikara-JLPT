import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSRSStorageKey,
  getStarredStorageKey,
  loadSRSRecords,
  saveSRSRecords,
  loadStarredWords,
  saveStarredWords,
  getRetrievability,
  calculateNextReview,
  formatIntervalLabel,
  previewNextIntervals,
  getDueWords,
  getSmartStudyQueue,
  getSRSAnalytics,
  exportAllUserData,
  importAllUserData,
  getAllUserDataSummary
} from '../src/utils/srs.js';

describe('Hybrid FSRS-SM2 Spaced Repetition Engine Test Suite', () => {

  test('Test 1: Storage keys generation and isolation for N1, N2, N3', () => {
    assert.equal(getSRSStorageKey('N1'), 'mimikara_n1_srs_records');
    assert.equal(getSRSStorageKey('N2'), 'mimikara_n2_srs_records');
    assert.equal(getSRSStorageKey('n3'), 'mimikara_n3_srs_records');

    assert.equal(getStarredStorageKey('N1'), 'mimikara_n1_starred');
    assert.equal(getStarredStorageKey('N2'), 'mimikara_n2_starred');
    assert.equal(getStarredStorageKey('N3'), 'mimikara_n3_starred');
  });

  test('Test 2: Storage persistence and isolation across JLPT levels', () => {
    const recordsN1 = { 101: { stage: 'good', repetitions: 3 } };
    const recordsN2 = { 201: { stage: 'hard', repetitions: 1 } };

    saveSRSRecords(recordsN1, 'N1');
    saveSRSRecords(recordsN2, 'N2');

    const loadedN1 = loadSRSRecords('N1');
    const loadedN2 = loadSRSRecords('N2');

    assert.deepEqual(loadedN1[101], recordsN1[101]);
    assert.equal(loadedN1[201], undefined, 'N1 should not contain N2 records');
    assert.deepEqual(loadedN2[201], recordsN2[201]);

    const starSetN1 = new Set([101, 102]);
    const starSetN3 = new Set([301]);

    saveStarredWords(starSetN1, 'N1');
    saveStarredWords(starSetN3, 'N3');

    const loadedStarsN1 = loadStarredWords('N1');
    const loadedStarsN3 = loadStarredWords('N3');

    assert.ok(loadedStarsN1.has(101));
    assert.ok(loadedStarsN1.has(102));
    assert.ok(!loadedStarsN1.has(301));
    assert.ok(loadedStarsN3.has(301));
  });

  test('Test 3: Retrievability R(t, S) formula mathematical precision', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const S = 10; // Stability = 10 days

    // Condition 1: At t = 0 (immediately reviewed), R(0, S) = 1.0 (100%)
    const rec0 = {
      state: 'review',
      stability: S,
      lastReviewed: now.toISOString()
    };
    const r0 = getRetrievability(rec0, now);
    assert.equal(r0, 1.0, 'R at t=0 must be exactly 1.0');

    // Condition 2: At t = S (elapsed days == stability), R(S, S) = 0.90 (90%)
    const elapsedS = new Date(now.getTime() + S * 24 * 60 * 60 * 1000);
    const rS = getRetrievability(rec0, elapsedS);
    assert.ok(Math.abs(rS - 0.90) < 1e-4, `R at t=S should be 0.90, got ${rS}`);

    // Condition 3: Strictly monotonic decreasing over time
    const tValues = [0, 2, 5, 10, 20, 50];
    const rValues = tValues.map((t) => {
      const d = new Date(now.getTime() + t * 24 * 60 * 60 * 1000);
      return getRetrievability(rec0, d);
    });

    for (let i = 0; i < rValues.length - 1; i++) {
      assert.ok(
        rValues[i] > rValues[i + 1],
        `Monotonic decrease violated: R(t=${tValues[i]})=${rValues[i]} <= R(t=${tValues[i+1]})=${rValues[i+1]}`
      );
    }
  });

  test('Test 4: Retrievability edge cases (unlearned card, missing stability, zero interval)', () => {
    assert.equal(getRetrievability(null), 0);
    assert.equal(getRetrievability(undefined), 0);
    assert.equal(getRetrievability({ state: 'new' }), 0);
    assert.equal(getRetrievability({ state: 'review' }), 0, 'Missing lastReviewed should yield 0');
    assert.equal(getRetrievability({ state: 'review', lastReviewed: new Date().toISOString(), stability: 0, interval: 0 }), 0);
  });

  test('Test 5: New card initial grading - Rating 1 (Again)', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const res = calculateNextReview(null, 1, now);

    assert.equal(res.state, 'learning');
    assert.equal(res.stage, 'again');
    assert.equal(res.repetitions, 0);
    assert.equal(res.lapses, 0);
    assert.ok(Math.abs(res.interval - (1 / 1440)) < 1e-6, 'Interval must be 1 minute in days');
    assert.equal(res.stability, 0.25);
    assert.equal(res.isLeech, false);
    assert.equal(res.history.length, 1);
    assert.equal(res.history[0].rating, 1);
  });

  test('Test 6: New card initial grading - Rating 2 (Hard)', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const res = calculateNextReview(null, 2, now);

    assert.equal(res.state, 'learning');
    assert.equal(res.stage, 'hard');
    assert.equal(res.repetitions, 1);
    assert.ok(Math.abs(res.interval - (6 / 1440)) < 1e-6, 'Interval must be 6 minutes in days');
    assert.equal(res.stability, 0.6);
  });

  test('Test 7: New card initial grading - Rating 3 (Good)', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const res = calculateNextReview(null, 3, now);

    assert.equal(res.state, 'review');
    assert.equal(res.stage, 'good');
    assert.equal(res.repetitions, 1);
    assert.equal(res.interval, 1, 'First Good interval must be 1 day');
    assert.equal(res.stability, 1);
  });

  test('Test 8: New card initial grading - Rating 4 (Easy)', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const res = calculateNextReview(null, 4, now);

    assert.equal(res.state, 'review');
    assert.equal(res.stage, 'easy');
    assert.equal(res.repetitions, 1);
    assert.equal(res.interval, 4, 'First Easy interval must be 4 days');
    assert.equal(res.stability, 4);
    assert.ok(res.easeFactor > 2.5, 'Ease factor should increase on Easy');
  });

  test('Test 9: Multi-step Good (3) progression', () => {
    let now = new Date('2026-11-10T10:00:00Z');
    let rec = null;

    // Step 1: Good -> interval 1
    rec = calculateNextReview(rec, 3, now);
    assert.equal(rec.interval, 1);
    assert.equal(rec.repetitions, 1);

    // Step 2: Good -> interval 3
    now = new Date(rec.nextReview);
    rec = calculateNextReview(rec, 3, now);
    assert.equal(rec.interval, 3);
    assert.equal(rec.repetitions, 2);

    // Step 3: Good -> factor expansion (interval >= 3 + 1)
    now = new Date(rec.nextReview);
    rec = calculateNextReview(rec, 3, now);
    assert.ok(rec.interval >= 7, `Expected interval >= 7 on 3rd Good, got ${rec.interval}`);
    assert.equal(rec.repetitions, 3);
    assert.equal(rec.state, 'review');
  });

  test('Test 10: Multi-step Easy (4) progression', () => {
    let now = new Date('2026-11-10T10:00:00Z');
    let rec = null;

    // Step 1: Easy -> interval 4
    rec = calculateNextReview(rec, 4, now);
    assert.equal(rec.interval, 4);
    assert.equal(rec.repetitions, 1);

    // Step 2: Easy -> interval 7
    now = new Date(rec.nextReview);
    rec = calculateNextReview(rec, 4, now);
    assert.equal(rec.interval, 7);
    assert.equal(rec.repetitions, 2);

    // Step 3: Easy -> rapid expansion (interval > 20)
    now = new Date(rec.nextReview);
    rec = calculateNextReview(rec, 4, now);
    assert.ok(rec.interval >= 20, `Expected interval >= 20 on 3rd Easy, got ${rec.interval}`);
    assert.equal(rec.repetitions, 3);
  });

  test('Test 11: EaseFactor bounds constraints (1.3 <= EF <= 3.0)', () => {
    let rec = null;
    const now = new Date();

    // 10 consecutive Again grades
    for (let i = 0; i < 10; i++) {
      rec = calculateNextReview(rec, 1, now);
    }
    assert.ok(rec.easeFactor >= 1.3, `EF fell below lower bound: ${rec.easeFactor}`);
    assert.equal(rec.easeFactor, 1.3);

    // 15 consecutive Easy grades
    for (let i = 0; i < 15; i++) {
      rec = calculateNextReview(rec, 4, now);
    }
    assert.ok(rec.easeFactor <= 3.0, `EF exceeded upper bound: ${rec.easeFactor}`);
    assert.equal(rec.easeFactor, 3.0);
  });

  test('Test 12: Difficulty bounds (1.0 <= D <= 10.0) and mean reversion', () => {
    let rec = null;
    const now = new Date();

    // Multiple Again grades to increase difficulty
    for (let i = 0; i < 12; i++) {
      rec = calculateNextReview(rec, 1, now);
    }
    assert.ok(rec.difficulty <= 10.0, `D exceeded upper bound: ${rec.difficulty}`);
    assert.ok(rec.difficulty >= 8.0, `D should be high after many Again grades: ${rec.difficulty}`);

    // Test mean reversion: High D card with Good ratings should gradually gravitate towards 5.0
    const highD = rec.difficulty;
    const recRevert = calculateNextReview(rec, 3, now);
    assert.ok(recRevert.difficulty < highD, `D should mean-revert towards 5.0 from high D: was ${highD}, now ${recRevert.difficulty}`);

    // Many Easy grades to drop difficulty
    for (let i = 0; i < 15; i++) {
      rec = calculateNextReview(rec, 4, now);
    }
    assert.ok(rec.difficulty >= 1.0, `D dropped below lower bound: ${rec.difficulty}`);
    assert.ok(rec.difficulty <= 2.5, `D should be low after many Easy grades: ${rec.difficulty}`);
  });

  test('Test 13: Lapse and Relearning preservation of priorInterval (40% recovery)', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    // A mastered card with 30 days interval
    const masteredRecord = {
      state: 'review',
      stage: 'good',
      repetitions: 4,
      interval: 30,
      stability: 30,
      easeFactor: 2.5,
      difficulty: 5.0,
      lapses: 0,
      lastReviewed: '2026-10-10T10:00:00Z',
      nextReview: '2026-11-09T10:00:00Z'
    };

    // User forgets card (Rating 1 - Again)
    const lapsed = calculateNextReview(masteredRecord, 1, now);
    assert.equal(lapsed.state, 'relearning');
    assert.equal(lapsed.stage, 'again');
    assert.equal(lapsed.repetitions, 0);
    assert.equal(lapsed.lapses, 1);
    // Prior interval must be 40% of 30 days = 12 days
    assert.equal(lapsed.priorInterval, 12, 'priorInterval should recover 40% of old 30-day interval');
    assert.ok(Math.abs(lapsed.interval - (10 / 1440)) < 1e-6, 'Relearning interval must be 10 minutes');

    // User subsequently relearns successfully (Rating 3 - Good)
    const relearned = calculateNextReview(lapsed, 3, now);
    assert.equal(relearned.state, 'review');
    assert.equal(relearned.stage, 'good');
    assert.equal(relearned.interval, 12, 'Interval should be restored to priorInterval (12 days)');
    assert.equal(relearned.priorInterval, null, 'priorInterval should be cleared after recovery');
  });

  test('Test 14: Leech detection mechanism (lapses >= 4)', () => {
    const now = new Date();
    let rec = {
      state: 'review',
      stage: 'good',
      repetitions: 3,
      interval: 10,
      stability: 10,
      lapses: 0
    };

    // 1st lapse
    rec = calculateNextReview(rec, 1, now);
    assert.equal(rec.lapses, 1);
    assert.equal(rec.isLeech, false);

    // 2nd lapse
    rec = calculateNextReview(rec, 1, now);
    assert.equal(rec.lapses, 2);
    assert.equal(rec.isLeech, false);

    // 3rd lapse
    rec = calculateNextReview(rec, 1, now);
    assert.equal(rec.lapses, 3);
    assert.equal(rec.isLeech, false);

    // 4th lapse: Threshold reached -> isLeech = true
    rec = calculateNextReview(rec, 1, now);
    assert.equal(rec.lapses, 4);
    assert.equal(rec.isLeech, true, 'Card with lapses >= 4 must be flagged as leech');
  });

  test('Test 15: Overdue bonus calculation', () => {
    const baseDate = new Date('2026-11-01T10:00:00Z');
    const card = {
      state: 'review',
      stage: 'good',
      repetitions: 2,
      interval: 5,
      stability: 5,
      easeFactor: 2.5,
      difficulty: 5.0,
      lastReviewed: baseDate.toISOString()
    };

    // Case A: Reviewed on-time (5 days later)
    const onTimeDate = new Date('2026-11-06T10:00:00Z');
    const resultOnTime = calculateNextReview(card, 3, onTimeDate);

    // Case B: Reviewed 20 days late (25 days after lastReviewed) and still remembered!
    const lateDate = new Date('2026-11-26T10:00:00Z');
    const resultLate = calculateNextReview(card, 3, lateDate);

    assert.ok(
      resultLate.interval > resultOnTime.interval,
      `Overdue bonus failed: late interval (${resultLate.interval}) should exceed on-time interval (${resultOnTime.interval})`
    );
  });

  test('Test 16: Review history tracking (max 20 records)', () => {
    const now = new Date();
    let rec = null;

    for (let i = 0; i < 25; i++) {
      rec = calculateNextReview(rec, (i % 4) + 1, now);
    }

    assert.equal(rec.history.length, 20, 'History should cap at exactly 20 entries');
    const lastEntry = rec.history[rec.history.length - 1];
    assert.ok(lastEntry.timestamp);
    assert.ok([1, 2, 3, 4].includes(lastEntry.rating));
    assert.ok(typeof lastEntry.interval === 'number');
  });

  test('Test 17: formatIntervalLabel formatting rules in Vietnamese', () => {
    // Under 1 hour
    assert.equal(formatIntervalLabel(1 / 1440), '1 phút');
    assert.equal(formatIntervalLabel(6 / 1440), '6 phút');
    assert.equal(formatIntervalLabel(10 / 1440), '10 phút');
    assert.equal(formatIntervalLabel(30 / 1440), '30 phút');

    // Under 1 day
    assert.equal(formatIntervalLabel(1 / 24), '1 giờ');
    assert.equal(formatIntervalLabel(0.5), '12 giờ');
    assert.equal(formatIntervalLabel(23 / 24), '23 giờ');

    // 1 to 29 days
    assert.equal(formatIntervalLabel(1), '1 ngày');
    assert.equal(formatIntervalLabel(3), '3 ngày');
    assert.equal(formatIntervalLabel(7), '7 ngày');
    assert.equal(formatIntervalLabel(29), '29 ngày');

    // 30 to 364 days
    assert.equal(formatIntervalLabel(30), '1 tháng');
    assert.equal(formatIntervalLabel(45), '1.5 tháng');
    assert.equal(formatIntervalLabel(60), '2 tháng');
    assert.equal(formatIntervalLabel(180), '6 tháng');

    // >= 365 days
    assert.equal(formatIntervalLabel(365), '1 năm');
    assert.equal(formatIntervalLabel(730), '2 năm');
  });

  test('Test 18: previewNextIntervals outputs valid formatted preview strings', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const previews = previewNextIntervals(null, now);

    assert.ok(previews[1], 'Preview for 1 must exist');
    assert.ok(previews[2], 'Preview for 2 must exist');
    assert.ok(previews[3], 'Preview for 3 must exist');
    assert.ok(previews[4], 'Preview for 4 must exist');

    assert.equal(previews[1], '1 phút');
    assert.equal(previews[2], '6 phút');
    assert.equal(previews[3], '1 ngày');
    assert.equal(previews[4], '4 ngày');
  });

  test('Test 19: getDueWords accurately identifies due cards', () => {
    const now = new Date('2026-11-10T10:00:00Z');
    const words = [
      { id: 1, word: '新語1' },
      { id: 2, word: '復習期限切れ' },
      { id: 3, word: '未来期限' }
    ];

    const srsRecords = {
      2: {
        state: 'review',
        nextReview: '2026-11-09T10:00:00Z' // Past -> Due
      },
      3: {
        state: 'review',
        nextReview: '2026-11-20T10:00:00Z' // Future -> Not due
      }
    };

    const due = getDueWords(words, srsRecords, now);
    const dueIds = due.map(w => w.id);

    assert.ok(dueIds.includes(1), 'New card (id=1) must be due');
    assert.ok(dueIds.includes(2), 'Overdue card (id=2) must be due');
    assert.ok(!dueIds.includes(3), 'Future card (id=3) must NOT be due');
  });

  test('Test 20: getSmartStudyQueue cognitive priority ordering', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const words = [
      { id: 10, word: 'NotDue' },
      { id: 20, word: 'NewWord' },
      { id: 30, word: 'ReviewHighR' },
      { id: 40, word: 'ReviewLowR' },
      { id: 50, word: 'RelearningDue' }
    ];

    const srsRecords = {
      10: {
        state: 'review',
        nextReview: '2026-11-25T12:00:00Z',
        stability: 15,
        lastReviewed: '2026-11-10T11:00:00Z'
      },
      // 20 is not in srsRecords -> New Card
      30: {
        state: 'review',
        nextReview: '2026-11-09T12:00:00Z', // 1 day overdue, stability 10 -> high R
        stability: 10,
        lastReviewed: '2026-10-30T12:00:00Z'
      },
      40: {
        state: 'review',
        nextReview: '2026-11-05T12:00:00Z', // 5 days overdue, stability 2 -> very low R
        stability: 2,
        lastReviewed: '2026-10-25T12:00:00Z'
      },
      50: {
        state: 'relearning',
        nextReview: '2026-11-10T11:50:00Z', // Due 10 minutes ago
        stability: 0.5,
        lastReviewed: '2026-11-10T11:40:00Z'
      }
    };

    const queue = getSmartStudyQueue(words, srsRecords, {}, now);
    const queueIds = queue.map(w => w.id);

    // Priority 1: Relearning due (id=50)
    assert.equal(queueIds[0], 50, 'Priority 1 should be relearning/learning due card');
    // Priority 2: Review due with lowest R first (id=40 has lowest R)
    assert.equal(queueIds[1], 40, 'Priority 2 should be review due card with lowest retrievability');
    assert.equal(queueIds[2], 30, 'Priority 3 should be review due card with higher retrievability');
    // Priority 3: New card (id=20)
    assert.equal(queueIds[3], 20, 'Priority 4 should be new card');
    // Priority 4: Future not due card (id=10)
    assert.equal(queueIds[4], 10, 'Priority 5 should be future not-due card');
  });

  test('Test 21: getSRSAnalytics statistical metrics calculation', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const allWords = [
      { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }
    ];

    const srsRecords = {
      1: { stage: 'again', state: 'relearning', lapses: 4, isLeech: true, lastReviewed: now.toISOString(), nextReview: now.toISOString(), stability: 1, difficulty: 7 },
      2: { stage: 'hard', state: 'review', lapses: 1, lastReviewed: now.toISOString(), nextReview: '2026-11-11T12:00:00Z', stability: 2, difficulty: 6 },
      3: { stage: 'good', state: 'review', lapses: 0, lastReviewed: now.toISOString(), nextReview: '2026-11-15T12:00:00Z', stability: 5, difficulty: 5 },
      4: { stage: 'easy', state: 'review', lapses: 0, lastReviewed: now.toISOString(), nextReview: '2026-11-20T12:00:00Z', stability: 10, difficulty: 4 },
      5: { stage: 'new' }
      // 6 is unrecorded -> new
    };

    const stats = getSRSAnalytics(allWords, srsRecords, now);

    assert.equal(stats.total, 6);
    assert.equal(stats.newCount, 2);
    assert.equal(stats.againCount, 1);
    assert.equal(stats.hardCount, 1);
    assert.equal(stats.goodCount, 1);
    assert.equal(stats.easyCount, 1);
    assert.equal(stats.masteredTotal, 2); // good + easy
    assert.equal(stats.dueReviewCount, 1); // card 1 is due
    assert.equal(stats.leechCount, 1); // card 1 has lapses >= 4
    assert.ok(stats.avgRetention >= 90, `Avg retention should be high just after review: ${stats.avgRetention}`);
    assert.ok(stats.avgStability > 0);
    assert.ok(stats.avgDifficulty > 0);
  });

  test('Test 22: getSRSAnalytics 7-day review forecast distribution', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    const allWords = [
      { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }
    ];

    const srsRecords = {
      // Due today (Day 0)
      1: { state: 'review', lastReviewed: '2026-11-09T00:00:00Z', nextReview: '2026-11-10T10:00:00Z' },
      // Due tomorrow (Day 1)
      2: { state: 'review', lastReviewed: '2026-11-09T00:00:00Z', nextReview: '2026-11-11T10:00:00Z' },
      // Due 3 days later (Day 3)
      3: { state: 'review', lastReviewed: '2026-11-09T00:00:00Z', nextReview: '2026-11-13T10:00:00Z' }
    };

    const stats = getSRSAnalytics(allWords, srsRecords, now);
    const forecast = stats.forecast7Days;

    assert.equal(forecast.length, 7, 'Forecast should cover exactly 7 days');
    assert.equal(forecast[0].label, 'Hôm nay');
    assert.equal(forecast[0].count, 1);
    assert.equal(forecast[1].count, 1);
    assert.equal(forecast[2].count, 0);
    assert.equal(forecast[3].count, 1);
    assert.equal(forecast[4].count, 0);
    assert.equal(forecast[5].count, 0);
    assert.equal(forecast[6].count, 0);
  });

  test('Test 23: exportAllUserData và getAllUserDataSummary cho cả 3 cấp độ N3, N2, N1', () => {
    // Chuẩn bị dữ liệu mẫu cho cả 3 cấp độ
    saveSRSRecords({ 301: { stage: 'good', reps: 2 } }, 'N3');
    saveStarredWords(new Set([301, 302]), 'N3');

    saveSRSRecords({ 201: { stage: 'easy', reps: 5 } }, 'N2');
    saveStarredWords(new Set([201]), 'N2');

    saveSRSRecords({ 101: { stage: 'hard', reps: 1 }, 102: { stage: 'good', reps: 3 } }, 'N1');
    saveStarredWords(new Set([101, 102, 103]), 'N1');

    // 1. Kiểm tra getAllUserDataSummary
    const summary = getAllUserDataSummary();
    assert.equal(summary.N3.srsCount, 1);
    assert.equal(summary.N3.starredCount, 2);
    assert.equal(summary.N2.srsCount, 1);
    assert.equal(summary.N2.starredCount, 1);
    assert.equal(summary.N1.srsCount, 2);
    assert.equal(summary.N1.starredCount, 3);
    assert.equal(summary.totalSRS, 4);
    assert.equal(summary.totalStarred, 6);

    // 2. Kiểm tra exportAllUserData
    const exported = exportAllUserData();
    assert.equal(exported.version, 2);
    assert.equal(exported.scope, 'ALL_LEVELS');
    assert.ok(exported.backupDate);
    assert.ok(exported.levels.N3.srsRecords[301]);
    assert.deepEqual(exported.levels.N3.starredList.sort(), [301, 302]);
    assert.ok(exported.levels.N2.srsRecords[201]);
    assert.deepEqual(exported.levels.N2.starredList, [201]);
    assert.ok(exported.levels.N1.srsRecords[101]);
    assert.ok(exported.levels.N1.srsRecords[102]);
    assert.deepEqual(exported.levels.N1.starredList.sort(), [101, 102, 103]);
  });

  test('Test 24: importAllUserData với merge: true (Gộp thông minh - bảo toàn từ cũ, ưu tiên bản ghi mới hơn, gộp sao)', () => {
    // Dữ liệu hiện có trên máy cho N1
    saveSRSRecords({
      101: { stage: 'good', reps: 2, lastReviewed: '2026-11-01T10:00:00Z' }, // Sẽ bị ghi đè vì backup mới hơn
      102: { stage: 'easy', reps: 6, lastReviewed: '2026-11-10T12:00:00Z' }  // Sẽ được giữ lại vì máy mới hơn backup
    }, 'N1');
    saveStarredWords(new Set([101, 105]), 'N1');

    // Dữ liệu trong file backup nạp vào
    const backupData = {
      version: 2,
      scope: 'ALL_LEVELS',
      levels: {
        N1: {
          srsRecords: {
            101: { stage: 'easy', reps: 4, lastReviewed: '2026-11-05T10:00:00Z' }, // Mới hơn ngày 01 -> Nhận bản này
            102: { stage: 'hard', reps: 1, lastReviewed: '2026-11-02T10:00:00Z' }, // Cũ hơn ngày 10 -> Giữ bản máy
            103: { stage: 'good', reps: 3, lastReviewed: '2026-11-04T10:00:00Z' }  // Từ mới chưa có trên máy -> Thêm mới
          },
          starredList: [101, 106]
        }
      }
    };

    const res = importAllUserData(backupData, { merge: true });
    assert.equal(res.success, true);
    assert.equal(res.merge, true);

    const mergedN1 = loadSRSRecords('N1');
    assert.equal(mergedN1[101].stage, 'easy', 'Từ 101 phải lấy bản ghi mới hơn từ backup');
    assert.equal(mergedN1[101].reps, 4);

    assert.equal(mergedN1[102].stage, 'easy', 'Từ 102 phải giữ bản ghi mới hơn trên máy');
    assert.equal(mergedN1[102].reps, 6);

    assert.ok(mergedN1[103], 'Từ 103 phải được thêm mới vào');
    assert.equal(mergedN1[103].reps, 3);

    const mergedStarred = loadStarredWords('N1');
    assert.equal(mergedStarred.size, 3, 'Starred phải là hợp của [101, 105] và [101, 106]');
    assert.ok(mergedStarred.has(101));
    assert.ok(mergedStarred.has(105));
    assert.ok(mergedStarred.has(106));
  });

  test('Test 25: importAllUserData với merge: false (Ghi đè) và tương thích ngược Version 1', () => {
    // 1. Kiểm tra Ghi đè toàn bộ (merge: false)
    saveSRSRecords({ 201: { stage: 'good' }, 202: { stage: 'easy' } }, 'N2');
    saveStarredWords(new Set([201, 202]), 'N2');

    const overwriteData = {
      version: 2,
      scope: 'ALL_LEVELS',
      levels: {
        N2: {
          srsRecords: { 203: { stage: 'hard' } },
          starredList: [203]
        }
      }
    };

    importAllUserData(overwriteData, { merge: false });
    const finalN2SRS = loadSRSRecords('N2');
    assert.equal(Object.keys(finalN2SRS).length, 1);
    assert.ok(finalN2SRS[203]);
    assert.equal(finalN2SRS[201], undefined);

    const finalN2Star = loadStarredWords('N2');
    assert.equal(finalN2Star.size, 1);
    assert.ok(finalN2Star.has(203));

    // 2. Kiểm tra tương thích ngược Version 1 (single level N3)
    const v1Data = {
      version: 1,
      app: 'Mimikara Oboeru JLPT',
      level: 'N3',
      srsRecords: { 301: { stage: 'easy', reps: 5 } },
      starredList: [301]
    };

    const resV1 = importAllUserData(v1Data, { merge: true });
    assert.equal(resV1.success, true);
    const n3SRS = loadSRSRecords('N3');
    assert.ok(n3SRS[301]);
    assert.equal(n3SRS[301].stage, 'easy');
  });

});
