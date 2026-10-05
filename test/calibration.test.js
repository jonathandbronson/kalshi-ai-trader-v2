import test from "node:test";import assert from "node:assert/strict";import {brierScore} from "../src/calibration.js";
test("perfect forecasts score zero",()=>assert.equal(brierScore([{probability:1,outcome:1},{probability:0,outcome:0}]),0));
