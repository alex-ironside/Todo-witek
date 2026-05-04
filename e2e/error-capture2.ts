/**
 * Tests a direct Firestore connection without persistent cache
 * by using a minimal Firebase SDK setup in Node, to get the raw error.
 */

// We test via fetch to the Firestore gRPC-web endpoint directly.
// The SDK error callback not firing with persistentLocalCache is a known
// behaviour: the SDK treats server errors as transient network issues
// and retries silently. We need to test without cache to see the error.

async function main() {
  const apiKey = 'AIzaSyDwy45pYYRH26lGTasIKyJkVUx7YHTUb0Q';
  const projectId = 'todo-witek-6a21e';

  // Sign in
  const signInResp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alex@gmail.com', password: 'zaq1@WSX', returnSecureToken: true }),
    }
  );
  const { idToken, localId: uid } = (await signInResp.json()) as { idToken: string; localId: string };
  console.log('uid:', uid);

  // Open a Firestore Listen channel and send the query
  // Step 1: POST to create the channel
  const initResp = await fetch(
    `https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2F${projectId}%2Fdatabases%2F(default)&RID=1&CVER=22&X-HTTP-Session-Id=gsessionid&zx=test&t=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Goog-Api-Client': 'gl-js/ fire/10.0.0',
      },
      body: 'count=0',
    }
  );
  console.log('Channel init status:', initResp.status);
  const initBody = await initResp.text();
  console.log('Channel init body:', initBody.slice(0, 300));

  // Extract gsessionid from response
  let gsessionid = '';
  const sessionMatch = initBody.match(/"([^"]{20,})"/);
  if (sessionMatch) {
    // Parse the CSSJSON format: 51\n[[0,["c","<id>","",8,14,30000]]]
    const lines = initBody.split('\n');
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed) && parsed[0]?.[1]?.[0] === 'c') {
          gsessionid = parsed[0][1][1];
          console.log('gsessionid:', gsessionid);
          break;
        }
      } catch { /* not JSON */ }
    }
  }

  if (!gsessionid) {
    console.log('Could not extract gsessionid from:', initBody);
    return;
  }

  // Step 2: POST a listen request with our query
  // Encode the listen request protobuf as JSON
  const listenRequest = {
    database: `projects/${projectId}/databases/(default)`,
    addTarget: {
      query: {
        parent: `projects/${projectId}/databases/(default)/documents`,
        structuredQuery: {
          from: [{ collectionId: 'todos' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'ownerId' },
              op: 'EQUAL',
              value: { stringValue: uid },
            },
          },
          orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
        },
      },
      targetId: 1,
    },
  };

  // Encode as base64 proto (we use JSON encoding which Firestore accepts via gRPC-web)
  const listenBody = JSON.stringify(listenRequest);
  const encoded = Buffer.from(listenBody).toString('base64');

  const listenResp = await fetch(
    `https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2F${projectId}%2Fdatabases%2F(default)&gsessionid=${gsessionid}&RID=2&AID=0&zx=test2&t=1`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Goog-Api-Client': 'gl-js/ fire/10.0.0',
      },
      body: `count=1&ofs=0&req0___data__=${encodeURIComponent(listenBody)}`,
    }
  );
  console.log('Listen POST status:', listenResp.status);
  const listenBody2 = await listenResp.text();
  console.log('Listen POST body:', listenBody2.slice(0, 500));

  // Step 3: GET the streaming response
  const streamResp = await fetch(
    `https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?VER=8&database=projects%2F${projectId}%2Fdatabases%2F(default)&gsessionid=${gsessionid}&CI=0&AID=1&TYPE=xmlhttp&zx=test3&t=1`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'X-Goog-Api-Client': 'gl-js/ fire/10.0.0',
      },
      signal: AbortSignal.timeout(8000),
    }
  );
  console.log('Stream GET status:', streamResp.status);
  const streamBody = await streamResp.text().catch((e: Error) => `(stream error: ${e.message})`);
  console.log('Stream body (first 1000):', streamBody.slice(0, 1000));
}

main().catch(console.error);
