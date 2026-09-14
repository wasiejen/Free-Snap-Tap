#1
- config parser that scans for violations of the spec and on reload directly can give feedback to the user. so move the many failure points of wrong config code away from the logic and before that into a single function that catches most obvious syntax error
  - central point to manage user feedback and give exact line and item references on what is wrong
  - moves from blindly working with the config to understanding the config and give help in writing it
  - so it is an evaluation of the config
    - needs to be checked what all can replaced by this via a feature_spec conform check
    - does is only check for syntax or also if the keywords are parsable
      - because i use python eval function that might be hard

open for suggestions on how this might look like
