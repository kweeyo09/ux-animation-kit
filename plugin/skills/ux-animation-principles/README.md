# ux-animation-principles (Claude Skill)

This Skill teaches Claude to apply 20 UX and animation principles to UI work. The
workflow is: assess the task → select the principles → translate them into specific
motion and layout decisions → implement → verify.

- `SKILL.md`: the workflow, the principle index (`ux-01` to `ux-20`), timing and easing
  tokens, the output format and a verification checklist.
- `references/principles.md`: for each of the 20 principles, what it does, when to use
  it, how to implement it, and one common pitfall.
- `references/accessibility-performance.md`: reduced motion, the relevant WCAG criteria,
  keyboard and focus, performance, and verification recipes.

## Import

- **Claude apps:** Customize → Skills → **+** → Create skill → **Upload a skill**. Upload a
  ZIP whose top-level entry is this folder (`ux-animation-principles/SKILL.md`). Code
  execution / file creation must be on (Settings → Capabilities).
- **Claude Code:** `/plugin install ux-animation-principles --marketplace kweeyo09/ux-animation-kit`,
  or copy this folder to `~/.claude/skills/` (personal) or `.claude/skills/` (project).

Note: the label of principle 20, "Frequency of use", is unverified. See its section in
`references/principles.md`.
