idea collection - for discussion in direct session

fuzzy search for reading files per name?
- to medigate the bitshift tendency of some numbers 
- when reading files this is not this dangerous to select the closest match e.g. in the path.

fuzzy search matchin in files to read specific lines?
- this could prevent the number shift also when trying to read specific sections

- instruction if you calculate in head use words and not numbers

is it possible to create a small general function that translates numberwords into numbers as output that is usable from anywhere in the shell or at least in the scope of node or python?
num(five) -> 5, num([five,five]) -> 55
to include in e.g. f-strings in python to convert wordnumbers in real number in instructions?
or part of every scipt that it will automaically replace strings in the input string for e.g. a path to replace <five> with 5 dynamically.

worker repeatedly failed to count around the number 94
- instruct to count with words
- used tools but could not write out the other numbers around 94 - everything stuck to it 89+1 = 94



e.g. example/draft of an iterceptor plugin to add fuzzy search and numberword replacement to any integrated tool call (quoted - not mine)

Example: LLM Tool Parameter Interceptor Plugintypescriptimport { type Plugin } from "@opencode-ai/plugin";
import { fuzzySearchPaths, convertNumberWords } from "./utils"; // Your custom helpers

export const ParameterCorrectionPlugin: Plugin = async (ctx) => {
  return {
    hooks: {
      // Fires right after the LLM requests a tool call, but before execution
      "tool.execute.before": async (toolCall) => {
        // Target specific tools likely to experience path or naming errors
        if (toolCall.name === "read" || toolCall.name === "write") {
          const args = toolCall.arguments as { path?: string };

          if (args.path) {
            let correctedPath = args.path;

            // 1. Fix low-quant model digit hallucinations (e.g., "file-four.txt" -> "file-4.txt")
            correctedPath = convertNumberWords(correctedPath);

            // 2. Run a fuzzy match against the workspace directory to fix minor typos
            correctedPath = await fuzzySearchPaths(correctedPath, ctx.workspace.rootPath);

            // Mutate the arguments object so the tool runs with the corrected path
            toolCall.arguments.path = correctedPath;
            
            console.log(`[Plugin] Corrected path from "${args.path}" to "${correctedPath}"`);
          }
        }
        
        return toolCall;
      },
    },
  };
};

export default ParameterCorrectionPlugin;

quote: "
Implementation Checklist for Lower-Quant ModelsWorkspace Crawling: For your fuzzy search, you will want to cache or dynamically crawl ctx.workspace.rootPath using standard Node.js fs module operations to match the LLM's hallucinated string against actual existing paths.Number Word Mapping: Implement a simple regex map (e.g., /\bone\b/g -> "1") to cleanly swap word tokens back into digits before running the path match.To help refine the logic or write the helper functions, could you tell me:What programming language or environment do you plan to use for your utility helpers (e.g., standard TypeScript, or do you have a preferred fuzzy search library like fuse.js)?What specific OS or environment constraints do you need to handle (e.g., relative vs. absolute paths, Windows vs. POSIX slashes)?
"


copied from done/info.md as context

# also do not try to calc in your hand, by eye or in your head with numbers. try to use numwords instead
  - fourtyfour is as clear as 44 (i presume?)
  - all the workers struggled with the old 94/94 line and had trouble with it ninetyfour/ninetyfour is also ok
  - maybe add <ninetyfour> to make it easier for later automatic replacement in all the files via replace

  - maybe we should add the rule. if there is doubt about a number write them both: the number and the numberword (in doubt the number word has priority - because i guess bitshift in numberwords is not as prevalent? - but it is just a guess - needs to be observed)
  - e.g. for the todo update the start of the file with both number and numberword to be sure. so the informatin lives i two places and if there is a mismatch then it is at least clear that their is one.

  - observed one planner having some problems with bitshifts in githashes or commit references. i can not say if these we correctly written our or not.
    - word_to_num tool would be helpful here
      - e.g "file-four.txt" -> "file-4.txt" 
      - but also applicable for commits like "b<six>c<eigth><six><one>d" -> "b6c861d"

  - this is al based on the assumption that numberwords have less bitdrift
