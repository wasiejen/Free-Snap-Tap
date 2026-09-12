
export async function execute(args, context) {
  return {
    content: `Tool context keys: ${Object.keys(context).join(", ")}`,
  }
}


// const session = await ctx.session.get({
//   sessionID: someSessionID,
// })

//V2 uses domain methods such as ctx.session, ctx.permission, and ctx.agent; it does not use ctx.client.session.
