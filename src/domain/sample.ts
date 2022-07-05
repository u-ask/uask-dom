import { Domain } from "./domain.js";

class Sample {
  readonly sampleCode: string;
  readonly name: string = "";
  readonly address: string = "";
  readonly frozen: boolean = false;

  constructor(sampleCode: string, kwargs?: Partial<Sample>) {
    this.sampleCode = sampleCode;
    Object.assign(this, kwargs);
    Domain.extend(this);
  }

  update(kwargs: Partial<Sample>): Sample {
    return Domain.update(this, kwargs, [Sample, this.sampleCode]);
  }

  freeze(): Sample {
    return this.update({ frozen: true });
  }
}

export { Sample };
