import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
// Every test process has its own database, baseline settings and no live credentials.
process.env.DATA_PATH=join(mkdtempSync(join(tmpdir(),'v2-unit-')),'state.sqlite');
for(const name of ['TRADER_AI_KEY','OPENAI_API_KEY','MIN_EDGE','STRONG_EDGE','MAX_FRACTION_PER_TRADE','MAX_API_COST_USD','MAX_API_REQUESTS','MODEL_INPUT_USD_PER_MILLION','MODEL_OUTPUT_USD_PER_MILLION'])delete process.env[name];
