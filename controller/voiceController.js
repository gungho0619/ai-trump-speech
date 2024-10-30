const { randomUUID } = require("crypto");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const fakeYouToken = "SAPI:FTK789_6096133E1D79D6FB"; // Correct token syntax
const cookieValue =
  "session=eyJhbGciOiJIUzI1NiJ9.eyJzZXNzaW9uX3Rva2VuIjoic2Vzc2lvbl84cnlkODNzM2g4azlmbjltdmY5NDc5ZHkiLCJ1c2VyX3Rva2VuIjoidXNlcl9jcnc1YXRwd2c0YWQ5IiwidmVyc2lvbiI6IjMifQ.lPP4YrjjjwZ0RcPEc1od7fAn7wWJy7Crz1YTaFaBGCw";

/*
  Name: fetchPatiently(String url, Object params): Object
  Description: Wrapper for node-fetch which retries upon 408 and 502 error codes
  Returns: HTTP response
*/
async function fetchPatiently(url, params) {
  const headers = {
    ...params.headers,
    cookie: cookieValue, // Add cookie here
  };

  let response = await fetch(url, { ...params, headers });
  while (response.status === 408 || response.status === 502) {
    // Wait three seconds between each new request
    await new Promise((res) => setTimeout(res, 3000));
    response = await fetch(url, { ...params, headers });
  }
  return response;
}

/*
  Name: poll(String token): String
  Description: Polls until a speech request is complete
  Returns: URL on success, error string on failure
*/
async function poll(token) {
  console.log("Polling for status...");

  // Wait one second between each poll request
  await new Promise((res) => setTimeout(res, 1000));

  const response = await fetchPatiently(
    `https://api.fakeyou.com/tts/job/${token}`,
    {
      method: "GET",
      headers: {
        Authorization: fakeYouToken,
        Accept: "application/json",
        cookie: cookieValue,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to fetch poll status");

  const json = await response.json();
  if (!json.success) throw new Error(`Failed polling! ${json.error_reason}`);

  switch (json.state.status) {
    case "pending":
    case "started":
    case "attempt_failed":
      console.log("Status:", json.state.status, "- continuing polling");
      return await poll(token);
    case "complete_success":
      console.log("Poll successful - Audio link ready");
      console.log(
        `https://storage.googleapis.com/vocodes-public${json.state.maybe_public_bucket_wav_audio_path}`
      );
      return `https://storage.googleapis.com/vocodes-public${json.state.maybe_public_bucket_wav_audio_path}`;
    default:
      throw new Error(`Polling failed with status: ${json.state.status}`);
  }
}

/*
  Name: voiceController  (String voice, String message): String
  Description: Requests speech and polls until job is complete
  Returns: URL on success, error string on failure
*/
async function voiceController(voice, message) {
  const response = await fetchPatiently(
    "https://api.fakeyou.com/tts/inference",
    {
      method: "POST",
      body: JSON.stringify({
        tts_model_token: voice,
        uuid_idempotency_token: randomUUID(),
        inference_text: message,
      }),
      headers: {
        Authorization: fakeYouToken,
        Accept: "application/json",
        "Content-Type": "application/json",
        cookie: cookieValue,
      },
    }
  );

  if (!response.ok) throw new Error("Failed to send voice request");

  const json = await response.json();
  if (!json.success)
    throw new Error(`Voice request failed! ${json.error_reason}`);

  console.log("Polling for the job token...");

  // Poll until request has been fulfilled
  return await poll(json.inference_job_token);
}

module.exports = { voiceController };
