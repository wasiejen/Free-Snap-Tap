ArgumentEnvironment VariableDefaultBehavior

--reasoning-loop-guard MODELLAMA_ARG_REASONING_LOOP_GUARD force-close 
 off: Disables checks. 
 force-close: Commands the reasoning sampler to prematurely end hidden reasoning and produce an answer.
 stop: Immediately terminates token generation when a loop triggers.

--reasoning-loop-min-tokens N 
LLAMA_ARG_REASONING_LOOP_MIN_TOKENS 512 Delays checking for repetitions until N hidden reasoning tokens have been generated.

--reasoning-loop-window N 
LLAMA_ARG_REASONING_LOOP_WINDOW 1024 Sets the size of the sliding token-tail window inspected for repeating patterns.

--reasoning-loop-max-period N 
LLAMA_ARG_REASONING_LOOP_MAX_PERIOD 128 Sets the maximum length of a periodic token phrase that will be flagged as a loop.
