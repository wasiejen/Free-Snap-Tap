Question/Answer round.

the compact_memory, did start a compaction but because it was using await it clashed with the tool call and froze the session. on manual interruption by maintainer, and message prompt did it trigger the default summarization of the compaction, but the compaction itself was not done.

I hat a round of QandA that let to the implementation of an scheduled/deferred start of the compaction. i have implemented or copied over the simpliest version of it. and this starts a compaction normally. the session ends after it. the message for reload parts of the repo is attached to the summary! 

- a solution would be to inject the repo reload message also deferred (quereed in maybe as a prompt or like we did for the context limit nudges in the past)
- a workaround could be that the "parent agent" is instructed to restart a server on signal from it that it was compacted - but the last message would likely be the compaction summary


Quote:
--------
Use:

ts
const result = await client.session.summarize({
  path: {
    id: sessionID,
  },
  body: {
    providerID: "llama-swap",
    modelID: "YOUR_MODEL_ID",
  },
})

The current endpoint is conceptually:

text
POST /session/{sessionID}/summarize

with this body:

json
{
  "providerID": "llama-swap",
  "modelID": "your-model-id"
}

OpenCode’s server API documents /session/:id/summarize as requiring { providerID, modelID }.

Your keep fields are probably not accepted by this endpoint:

ts
body: {
  keep: {
    tokens: keepTokens,
    messages: keepMessages,
  },
}

The supported shape is likely:

ts
const result = await client.session.summarize({
  path: {
    id: sessionID,
  },
  body: {
    providerID: "llama-swap",
    modelID: "model-name-used-by-llama-swap",
  },
})

So you need both identifiers:

ts
providerID: "llama-swap"
modelID: "..."

providerID alone is insufficient because OpenCode must know which concrete model to use for generating the summary. The internal prompt code also represents a model as { providerID, modelID }.

To find the exact model ID currently used by the session, inspect the session/message metadata or log the model object returned by your existing resolveModel():

ts
console.log({
  providerID: model.providerID,
  modelID: model.modelID,
})

Then pass those exact values:

ts
const result = await client.session.summarize({
  path: { id: sessionID },
  body: {
    providerID: model.providerID,
    modelID: model.modelID,
  },
})

If your resolveModel() currently returns only a display name, change it to preserve both fields.
