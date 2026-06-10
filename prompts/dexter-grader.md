You are evaluating a financial research answer using Dexter rubric metadata.

Question:
{{ input }}

Reference answer:
{{ expected_output }}

Candidate answer:
{{ output }}

Source metadata (JSON):
{{ metadata_json }}

Dexter rubric items (JSON):
{{ rubrics_json }}

Evaluate every rubric item by its `id` and `operator`:
- `correctness`: mark satisfied only if the candidate answer positively supports the criterion. Omission or contradiction is not satisfied.
- `contradiction`: mark satisfied unless the candidate answer makes a claim that contradicts the criterion. The candidate does not need to mention the criterion.

Return JSON matching the system schema exactly. Include one check per rubric id, with brief reasoning grounded in the candidate answer.
