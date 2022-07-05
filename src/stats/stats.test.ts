import test from "tape";
import { partition, percentiles } from "./stats.js";

test("Percentiles", t => {
  const array = [1, 9, 53, 78, 43, 56, 62, 23, 70, 3, 4, 6, 2];
  const res = percentiles(array);
  t.deepEqual(res, [1, 4, 23, 56, 78]);
  t.end();
});

test("Quartiles for a single value", t => {
  const array = [62];
  const res = percentiles(array);
  t.deepEqual(res, [62, 62, 62, 62, 62]);
  t.end();
});

test("Quartiles for a repeated value", t => {
  const array = [62, 62, 62, 62, 62, 62, 62, 62, 62, 62];
  const res = percentiles(array);
  t.deepEqual(res, [62, 62, 62, 62, 62]);
  t.end();
});

test("Median for 2 values", t => {
  const array = [62, 65];
  const res = percentiles(array, 2);
  t.deepEqual(res, [62, 63.5, 65]);
  t.end();
});

test("Quartiles for 2 values", t => {
  const array = [62, 65];
  const res = percentiles(array, 4);
  t.deepEqual(res, [62, 62.75, 63.5, 64.25, 65]);
  t.end();
});

test("Quartiles for 3 values", t => {
  const array = [62, 65, 62];
  const res = percentiles(array, 4);
  t.deepEqual(res, [62, 62, 62, 63.5, 65]);
  t.end();
});

test("Partition in 2 segments", t => {
  t.deepEqual(partition(2, 2), [0, 0.5, 1]);
  t.deepEqual(partition(3, 2), [0, 1, 2]);
  t.deepEqual(partition(4, 2), [0, 1.5, 3]);
  t.deepEqual(partition(5, 2), [0, 2, 4]);
  t.deepEqual(partition(50, 2), [0, 24.5, 49]);
  t.deepEqual(partition(51, 2), [0, 25, 50]);
  t.end();
});

test("Partition in 4 segments", t => {
  t.deepEqual(partition(2, 4), [0, 0.25, 0.5, 0.75, 1]);
  t.deepEqual(partition(3, 4), [0, 0.5, 1, 1.5, 2]);
  t.deepEqual(partition(4, 4), [0, 0.75, 1.5, 2.25, 3]);
  t.deepEqual(partition(5, 4), [0, 1, 2, 3, 4]);
  t.deepEqual(partition(50, 4), [0, 12.25, 24.5, 36.75, 49]);
  t.deepEqual(partition(51, 4), [0, 12.5, 25, 37.5, 50]);
  t.deepEqual(partition(52, 4), [0, 12.75, 25.5, 38.25, 51]);
  t.deepEqual(partition(53, 4), [0, 13, 26, 39, 52]);
  t.end();
});
