"use strict";

const HIBP = require("../hibp");
const DB = require("../db/DB");
const getSha1 = require("../sha1-utils");


jest.mock("../hibp");


beforeAll(() => {
  DB.createConnection();
});


test("getSubscriberByToken accepts token and returns subscriber", async () => {
  const testEmail = "unverifiedemail@test.com";
  const testToken = "0e2cb147-2041-4e5b-8ca9-494e773b2cf0";
  const subscriber = await DB.getSubscriberByToken(testToken);

  expect(subscriber.email).toBe(testEmail);
  expect(subscriber.verification_token).toBe(testToken);
});

test("getSubscribersByHashes accepts hashes and only returns verified subscribers", async () => {
  const testHashes = [
    "firefoxaccount@test.com",
    "unverifiedemail@test.com",
    "verifiedemail@test.com",
  ].map(email => getSha1(email));
  const subscribers = await DB.getSubscribersByHashes(testHashes);
  for (const subscriber of subscribers) {
    expect(subscriber.verified).toBeTruthy();
  }
});

test("addSubscriberUnverifiedEmailHash accepts email and returns unverified subscriber with sha1 hash and verification token", async () => {
  const testEmail = "test@test.com";
  // https://stackoverflow.com/a/13653180
  const uuidRE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const subscriber = await DB.addSubscriberUnverifiedEmailHash(testEmail);
  expect(subscriber.sha1).toBe(getSha1(testEmail));
  expect(uuidRE.test(subscriber.verification_token)).toBeTruthy();
  expect(subscriber.verified).toBeFalsy();
});


test("verifyEmailHash accepts token and returns verified subscriber", async () => {
  const testEmail = "verifyEmailHash@test.com";

  const unverifiedSubscriber = await DB.addSubscriberUnverifiedEmailHash(testEmail);
  expect(unverifiedSubscriber.verified).toBeFalsy();

  HIBP.subscribeHash.mockResolvedValue(true);
  const verifiedSubscriber = await DB.verifyEmailHash(unverifiedSubscriber.verification_token);
  expect(verifiedSubscriber.sha1).toBe(getSha1(testEmail));
  expect(verifiedSubscriber.verified).toBeTruthy();
});


test("addSubscriber accepts email and returns verified subscriber", async () => {
  const testEmail = "newFirefoxAccount@test.com";

  const verifiedSubscriber = await DB.addSubscriber(testEmail);

  expect(verifiedSubscriber.email).toBe(testEmail);
  expect(verifiedSubscriber.verified).toBeTruthy();
  expect(verifiedSubscriber.sha1).toBe(getSha1(testEmail));
});


test("removeSubscriber accepts email and removes the email address", async () => {
  const testEmail = "removingFirefoxAccount@test.com";

  const verifiedSubscriber = await DB.addSubscriber(testEmail);
  let subscribers = await DB.getSubscribersByHashes([getSha1(testEmail)]);
  expect(subscribers.length).toEqual(1);

  await DB.removeSubscriber(verifiedSubscriber.email);
  subscribers = await DB.getSubscribersByHashes([getSha1(testEmail)]);
  expect(subscribers.length).toEqual(0);
});


afterAll(() => {
  DB.destroyConnection();
});
