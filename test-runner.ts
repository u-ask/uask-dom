import tape from "tape";
import glob from "glob";
import { pathToFileURL } from "url";
import dotenv from "dotenv";
dotenv.config();

const runner = (function () {
  const termination = /^1\.\./;
  const start = /^#/;
  const failure = /^not ok/;

  let current = "";
  let terminated = false;
  let file = "";

  function error(d: string) {
    if (current) {
      console.error(`\n# ${file}`);
      console.error(current);
    }
    console.error(d);
    current = "";
  }

  function log(d: string) {
    d = d.trim();
    if (termination.test(d)) terminated = true;
    else if (terminated) console.log(d);
    else if (start.test(d)) current = d;
    else if (failure.test(d)) error(d);
  }

  function load(f: string) {
    tape("__", t => {
      file = f;
      t.end();
    });
    file = f;
    return import(pathToFileURL(file).href);
  }

  console.log();
  return { load, log };
})();

tape.createStream().on("data", d => {
  runner.log(d);
});

tape("__runner__", async t => {
  const files = glob.sync(process.argv[2] ?? "src/**/*.test.ts");
  for (const file of files) await runner.load(file);
  t.end();
});
