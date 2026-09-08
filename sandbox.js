/**
 * sandbox.js -- Third-Order Audit reference implementation in Node.js.
 * 
 * Structural checker for a research corpus, following Huynh (2026), "The
 * Third-Order Audit" and "The Research Sandbox". Answers three narrow,
 * answerable questions about a set of research objects (papers/claims):
 * 
 *   Order 1 -- does a stated, specific falsification condition exist?
 *   Order 2 -- does at least one falsification condition point OUTWARD,
 *              at something checkable independent of the corpus's own
 *              vocabulary (a dated event, an independent paper, a primary
 *              source), rather than only at internal terms?
 *   Order 3 -- across the whole loaded set, do revision events over time
 *              narrow/withdraw claims more often than they merely
 *              reaffirm them unchanged after a challenge (Lakatos
 *              progressive vs. degenerating, operationalized as a
 *              category count rather than a fabricated numeric metric)?
 */

export const DeltaType = {
  NARROWED: 'narrowed',
  WITHDRAWN: 'withdrawn',
  REAFFIRMED: 'reaffirmed',
  EXTENDED: 'extended',
};

export class ResearchObject {
  constructor({
    id,
    title = '',
    falsification_conditions = [],
    revisions = [],
    self_referential_audit_present = false,
  }) {
    this.id = id;
    this.title = title;
    this.falsification_conditions = falsification_conditions;
    this.revisions = revisions;
    this.self_referential_audit_present = self_referential_audit_present;
  }

  order1Pass() {
    return Array.isArray(this.falsification_conditions) && this.falsification_conditions.length > 0;
  }

  order2Pass() {
    return Array.isArray(this.falsification_conditions) &&
      this.falsification_conditions.some((fc) => Boolean(fc.references_external_source));
  }

  thirdBreakBoundaryRisk() {
    return Boolean(this.self_referential_audit_present);
  }

  flags() {
    const out = [];
    if (!this.order1Pass()) {
      out.push('NO_FALSIFICATION_CONDITION');
    }
    if (!this.order2Pass()) {
      out.push('NO_EXTERNAL_CHECKABLE_CONDITION');
    }
    if (this.thirdBreakBoundaryRisk()) {
      out.push('THIRD_BREAK_BOUNDARY_RISK');
    }
    return out;
  }

  toDict() {
    return {
      id: this.id,
      title: this.title,
      falsification_conditions: this.falsification_conditions,
      revisions: this.revisions,
      self_referential_audit_present: this.self_referential_audit_present,
    };
  }
}

export class ResearchSandbox {
  constructor(objects = []) {
    this.objects = objects.map((obj) => (obj instanceof ResearchObject ? obj : new ResearchObject(obj)));
  }

  order3ProgrammeReport() {
    let total = 0;
    let narrowed_or_withdrawn = 0;
    let reaffirmed = 0;
    let extended = 0;
    const reaffirmed_cases = [];

    for (const obj of this.objects) {
      for (const rev of obj.revisions || []) {
        total += 1;
        const deltaType = rev.delta_type;
        if (deltaType === DeltaType.NARROWED || deltaType === DeltaType.WITHDRAWN) {
          narrowed_or_withdrawn += 1;
        } else if (deltaType === DeltaType.REAFFIRMED) {
          reaffirmed += 1;
          reaffirmed_cases.push({ paper: obj.id, trigger: rev.trigger });
        } else if (deltaType === DeltaType.EXTENDED) {
          extended += 1;
        }
      }
    }

    return {
      total_revision_events: total,
      narrowed_or_withdrawn,
      reaffirmed_unchanged: reaffirmed,
      extended_new_material: extended,
      constraint_ratio: total ? Math.round((narrowed_or_withdrawn / total) * 1000) / 1000 : null,
      reaffirmed_unchanged_cases: reaffirmed_cases,
    };
  }

  flaggedPapersReport() {
    const out = {};
    for (const obj of this.objects) {
      const f = obj.flags();
      if (f.length > 0) {
        out[obj.id] = f;
      }
    }
    return out;
  }

  fullReport() {
    return {
      programme_level: this.order3ProgrammeReport(),
      flagged_papers: this.flaggedPapersReport(),
      n_objects: this.objects.length,
      n_passing_both_orders: this.objects.filter((o) => o.order1Pass() && o.order2Pass()).length,
    };
  }
}

export function diffReport(a, b) {
  const objA = a instanceof ResearchObject ? a : new ResearchObject(a);
  const objB = b instanceof ResearchObject ? b : new ResearchObject(b);

  if (objA.id !== objB.id) {
    throw new Error(`diffReport compares two codings of the SAME object; got '${objA.id}' vs '${objB.id}'`);
  }

  const keyForRev = (r) => `${r.delta_type}:::${r.trigger}`;
  const aTriggers = new Set((objA.revisions || []).map(keyForRev));
  const bTriggers = new Set((objB.revisions || []).map(keyForRev));

  const revisionsOnlyInA = (objA.revisions || []).filter((r) => !bTriggers.has(keyForRev(r)));
  const revisionsOnlyInB = (objB.revisions || []).filter((r) => !aTriggers.has(keyForRev(r)));
  const revisionsInBoth = (objA.revisions || []).filter((r) => bTriggers.has(keyForRev(r)));

  return {
    id: objA.id,
    order1_pass_agree: objA.order1Pass() === objB.order1Pass(),
    order2_pass_agree: objA.order2Pass() === objB.order2Pass(),
    a_order1_order2: [objA.order1Pass(), objA.order2Pass()],
    b_order1_order2: [objB.order1Pass(), objB.order2Pass()],
    revisions_only_in_a: revisionsOnlyInA.map((r) => ({ delta_type: r.delta_type, trigger: r.trigger })),
    revisions_only_in_b: revisionsOnlyInB.map((r) => ({ delta_type: r.delta_type, trigger: r.trigger })),
    revisions_in_both: revisionsInBoth.map((r) => ({ delta_type: r.delta_type, trigger: r.trigger })),
    agrees_exactly:
      revisionsOnlyInA.length === 0 &&
      revisionsOnlyInB.length === 0 &&
      objA.order1Pass() === objB.order1Pass() &&
      objA.order2Pass() === objB.order2Pass(),
  };
}
