# Spiral

DSL based eCRF

# Install

Clone the repository from github:

```bash
> git clone https://github.com/invarture-arone/Spiral.git
> cd Spiral
> npm install
```

On windows, npm scripts use git bash. Install git ([here](https://git-scm.com/downloads)) and configure default npm shell as follows:

```shell
PS> npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
```

or (depending on the OS version):

```shell
PS> npm config set script-shell "C:\\Program Files (x86)\\git\\bin\\bash.exe"
```

# Scripts

| script              | description                                       |
| ------------------- | ------------------------------------------------- |
| `npm run -s bundle` | build a javascript ES6 bundle: `spiral.bundle.js` |
| `npm run -s doc`    | build HTML documentation in `docs` subfolder      |
| `npm run -s lint`   | execute linter on source files, don't fix         |
| `npm run -s test`   | run all unit tests                                |

# Unit tests

Tests are implemented using `tape` library (see [tape on Github](https://github.com/substack/tape)).
For convenience the extension module `test-extension` can be imported, it provides helper methods. For example :

```typescript
import test from "tape";
import "../test-extension";

const fruits = ["banana", "orange", "strawberry", "apple"];

test("fruits contains apple and orange", t => {
  t.arrayContains(fruits, ["apple", "orange"]);
  t.end();
});
```

_note:_ don't forget to use t.end() to properly end tests. This is a general rule, not only for the extension.

# VSCode integration

Debugging tape tests needs extra configuration in VSCode. The `.vscode\launch.json` has been added to the repository. When new configurations are added, they must be independent of the local machine; for instance, you have to use the vscode variables.

# Rules precedence

To ensure that rules don't provoke conflicts between each other and that they'll be executed in the correct order, they have a fixed precedence. The higher the precedence number, the earlier the rule will be applied in the answers validation. The actual precedence is as follow :

| Precedence   | Rule                   |
| ------------ | ---------------------- |
| 100          | ComputedRule           |
| 70           | RequiredRule           |
| 50           | ActivationRule         |
| 10           | DecimalPrecisionRule   |
| 10           | FixedLengthRule        |
| 10           | InRangeRule            |
| 10           | MaxLengthRule          |
| 10           | LetterCaseRule         |