# output of context/ctx tool parameter:
path of working (after restart) tool: .opencode\tools\dev_get_tool_context_contents.ts

export async function execute(args: any, context: any) {

  return JSON.stringify({
    sessionID:  context.sessionID,
    abort:  context.abort,
    messageID:  context.messageID,
    callID:  context.callID,
    extra:  context.extra,
    agent:  context.agent,
    //messages:  context.messages, // to much info - one example at the end
    metadata:  context.metadata,
    ask:  context.ask,
    directory:  context.directory,
    worktree:  context.worktree,
  }, null, 2)
}


{
  "sessionID": "ses_f6a7938a0ffeWOfcOHOmX9PR6P",
  "abort": {},
  "messageID": "msg_095913d0e001QwtASOkUeO9TZ8",
  "callID": "YH1pA4rhnbNyYV7DJhyCIVOHV9FwkmpY",
  "extra": {
    "model": {
      "id": "Qwen3.8-27B-IQ4KT-120K",
      "api": {
        "id": "Qwen3.8-27B-IQ4KT-120K",
        "npm": "@ai-sdk/openai-compatible",
        "url": ""
      },
      "status": "active",
      "name": "Qwen3.8-27B-IQ4KT",
      "providerID": "llama-swap",
      "capabilities": {
        "temperature": false,
        "reasoning": false,
        "attachment": false,
        "toolcall": true,
        "input": {
          "text": true,
          "audio": false,
          "image": false,
          "video": false,
          "pdf": false
        },
        "output": {
          "text": true,
          "audio": false,
          "image": false,
          "video": false,
          "pdf": false
        },
        "interleaved": false
      },
      "cost": {
        "input": 0,
        "output": 0,
        "cache": {
          "read": 0,
          "write": 0
        }
      },
      "options": {},
      "limit": {
        "context": 120000,
        "output": 120000
      },
      "headers": {},
      "family": "",
      "release_date": "",
      "variants": {}
    },
    "bypassAgentCheck": false,
    "promptOps": {}
  },
  "agent": "agent_Q4_120K",
  "directory": "C:\\Users\\Wasiejen\\Projects\\OpenCodeProjects\\Free-Snap-Tap\\Free-Snap-Tap",
  "worktree": "C:\\Users\\Wasiejen\\Projects\\OpenCodeProjects\\Free-Snap-Tap\\Free-Snap-Tap"
}

"messages": [
{
  "info": {
    "role": "user",
    "time": {
      "created": 1789215033194
    },
    "agent": "agent_Q4_120K",
    "model": {
      "providerID": "llama-swap",
      "modelID": "Qwen3.8-27B-IQ4KT-120K"
    },
    "summary": {
      "diffs": []
    },
    "id": "msg_09586c76a001u8igUcH1m4mfL6",
    "sessionID": "ses_f6a7938a0ffeWOfcOHOmX9PR6P"
  },
  "parts": [
    {
      "type": "text",
      "text": "ctx: SESSION=ses_f6a7938a0ffeWOfcOHOmX9PR6P CTX=notAvailable",
      "id": "prt-ctx-69f7eded-3291-4357-a8b8-2b6aa803d176",
      "sessionID": "ses_f6a7938a0ffeWOfcOHOmX9PR6P",
      "messageID": "msg_09586c76a001u8igUcH1m4mfL6"
    },
    {
      "type": "text",
      "text": "what tools do you have access to?",
      "id": "prt_09586c76b001ZLA8fKjRX42KMr",
      "sessionID": "ses_f6a7938a0ffeWOfcOHOmX9PR6P",
      "messageID": "msg_09586c76a001u8igUcH1m4mfL6"
    }
  ]
},
