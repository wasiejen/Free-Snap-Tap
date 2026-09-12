// C:\Users\you\oc-dev\implementation.ts
export async function execute(args: any, context: any) {

  return JSON.stringify({
    sessionID:  context.sessionID,
    abort:  context.abort,
    messageID:  context.messageID,
    callID:  context.callID,
    extra:  context.extra,
    agent:  context.agent,
    //messages:  context.messages, // to much info
    metadata:  context.metadata,
    ask:  context.ask,
    directory:  context.directory,
    worktree:  context.worktree,
  }, null, 2)
}


// {
//   "sessionID": "ses_f6a7938a0ffeWOfcOHOmX9PR6P",
//   "abort": {},
//   "messageID": "msg_095913d0e001QwtASOkUeO9TZ8",
//   "callID": "YH1pA4rhnbNyYV7DJhyCIVOHV9FwkmpY",
//   "extra": {
//     "model": {
//       "id": "Qwen3.8-27B-IQ4KT-120K",
//       "api": {
//         "id": "Qwen3.8-27B-IQ4KT-120K",
//         "npm": "@ai-sdk/openai-compatible",
//         "url": ""
//       },
//       "status": "active",
//       "name": "Qwen3.8-27B-IQ4KT",
//       "providerID": "llama-swap",
//       "capabilities": {
//         "temperature": false,
//         "reasoning": false,
//         "attachment": false,
//         "toolcall": true,
//         "input": {
//           "text": true,
//           "audio": false,
//           "image": false,
//           "video": false,
//           "pdf": false
//         },
//         "output": {
//           "text": true,
//           "audio": false,
//           "image": false,
//           "video": false,
//           "pdf": false
//         },
//         "interleaved": false
//       },
//       "cost": {
//         "input": 0,
//         "output": 0,
//         "cache": {
//           "read": 0,
//           "write": 0
//         }
//       },
//       "options": {},
//       "limit": {
//         "context": 120000,
//         "output": 120000
//       },
//       "headers": {},
//       "family": "",
//       "release_date": "",
//       "variants": {}
//     },
//     "bypassAgentCheck": false,
//     "promptOps": {}
//   },
//   "agent": "agent_Q4_120K",
//   "directory": "C:\\Users\\Wasiejen\\Projects\\OpenCodeProjects\\Free-Snap-Tap\\Free-Snap-Tap",
//   "worktree": "C:\\Users\\Wasiejen\\Projects\\OpenCodeProjects\\Free-Snap-Tap\\Free-Snap-Tap"
// }
