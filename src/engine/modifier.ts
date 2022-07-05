import { mlstring } from "..";

type ModifierSymbol = {
  symbol: "doubleWording" | "basicComment" | "classes";
} & Modifier;

export type Modifier = {
  comment?: mlstring;
  leftWording?: mlstring;
  rightWording?: mlstring;
  classes?: string[];
};

export function parseComment(comment: mlstring): Modifier {
  const symbols = getSymbols(comment);
  return symbols.reduce((result, s) => {
    const { symbol, ...others } = s;
    switch (symbol) {
      case "doubleWording":
        result = parseDoubleWording(
          result,
          others.leftWording as mlstring,
          others.rightWording as mlstring
        );
        break;
      case "basicComment":
        result = parseBasicComment(result, others.comment as mlstring);
        break;
      case "classes":
        result = parseClasses(result, others.classes as string[]);
        break;
    }
    return result;
  }, {} as Modifier);
}

function getSymbols(comment: mlstring): ModifierSymbol[] {
  const s: ModifierSymbol[] = [];
  const contentWordings = matchDoubleWording(comment);
  if (contentWordings) s.push(contentWordings);
  const contentClasses = matchClasses(comment);
  if (contentClasses) s.push(contentClasses);
  const contentComment = s.length > 0 ? matchBasicComment(comment) : undefined;
  if (contentComment) s.push(contentComment);
  return s;
}

function matchDoubleWording(
  comment: mlstring,
  lang?: string
): ModifierSymbol | undefined {
  if (typeof comment == "string") {
    const matches = /<(.+) \| (.+)>/.exec(comment);
    if (matches && matches.length > 2)
      return {
        symbol: "doubleWording",
        leftWording: lang ? { [lang]: matches[1] } : matches[1],
        rightWording: lang ? { [lang]: matches[2] } : matches[2],
      };
  } else {
    const matches = Object.entries(comment)
      .map(([lang, label]) => matchDoubleWording(label, lang))
      .filter((m): m is ModifierSymbol => !!m);
    if (matches.length > 0)
      return matches.reduce((result, s) => {
        result.leftWording = {
          ...(result.leftWording as Record<string, string>),
          ...(s.leftWording as Record<string, string>),
        };
        result.rightWording = {
          ...(result.rightWording as Record<string, string>),
          ...(s.rightWording as Record<string, string>),
        };
        return result;
      });
  }
}

function matchBasicComment(
  comment: mlstring,
  lang?: string
): ModifierSymbol | undefined {
  if (typeof comment == "string") {
    const matches = /^[^()]*\((.*)\)[^()]*$/.exec(
      comment.replace(/<.+ \| .+>/g, "")
    );
    if (matches)
      return {
        symbol: "basicComment",
        comment: lang ? { [lang]: matches[1] } : matches[1],
      };
  } else {
    const matches = Object.entries(comment)
      .map(([lang, label]) => matchBasicComment(label, lang))
      .filter((m): m is ModifierSymbol => !!m);
    if (matches.length > 0)
      return matches.reduce((result, s) => {
        result.comment = {
          ...(result.comment as Record<string, string>),
          ...(s.comment as Record<string, string>),
        };
        return result;
      });
  }
}

// eslint-disable-next-line radar/cognitive-complexity
function matchClasses(
  comment: mlstring,
  lang?: string
): ModifierSymbol | undefined {
  if (typeof comment == "string") {
    const matchClasses = /{(.+)}/.exec(comment);
    if (matchClasses) {
      const classes = matchClasses[1].match(/[^.]+/g); // split on .
      if (classes)
        return {
          symbol: "classes",
          classes: classes,
        };
    }
  } else {
    const matches = Object.entries(comment)
      .map(([lang, label]) => matchClasses(label, lang))
      .filter((m): m is ModifierSymbol => !!m);
    if (matches.length > 0)
      return matches.reduce((result, s) => {
        if (result.classes)
          s.classes?.map(c => {
            if (!result.classes?.includes(c)) result.classes?.push(c);
          });
        else result.classes = s.classes;
        return result;
      });
  }
}

function parseDoubleWording(
  modifier: Modifier,
  leftWording: mlstring,
  rightWording: mlstring
): Modifier {
  return Object.assign(modifier, { leftWording, rightWording });
}

function parseBasicComment(modifier: Modifier, comment: mlstring): Modifier {
  return Object.assign(modifier, { comment });
}

function parseClasses(modifier: Modifier, classes: string[]): Modifier {
  return Object.assign(modifier, { classes });
}
