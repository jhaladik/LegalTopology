# Legal Topology: Comprehensive Test Suite

**Date:** September 26, 2025
**Tester Role:** Legal Professional
**System Status:** 2,652/4,464 chunks indexed (59%)

---

## Test Methodology

As a lawyer testing this system, I need to validate:
1. **Accuracy**: Does it find the right legal provisions?
2. **Completeness**: Does it cite all relevant law?
3. **Reasoning Quality**: Is the legal analysis sound?
4. **Practical Utility**: Can I trust this for client advice?

---

## Test Suite 1: Contract Formation (§1724-§1766)

### Test 1.1: Basic Contract Formation
**Query:**
```json
{
  "question": "What are the essential elements required to form a valid contract under Czech civil law?",
  "topK": 10
}
```

**Expected Statutory Foundation:**
- §1724 (definition of contract)
- §1725 (offer and acceptance)
- §1726 (mutual consent)
- §1729 (certainty of terms)

**Legal Analysis Criteria:**
- [ ] Identifies all four essential elements (offer, acceptance, intention, consideration)
- [ ] Cites correct sections
- [ ] Explains each requirement clearly
- [ ] Notes any exceptions or special cases

---

### Test 1.2: Acceptance by Conduct
**Query:**
```json
{
  "question": "Can acceptance of a contract offer be implied through conduct or actions, or must it be explicitly stated?",
  "facts": {
    "situation": "supplier delivered goods without written acceptance",
    "conduct": "buyer received goods and started using them"
  }
}
```

**Expected Provisions:**
- §1740 (acceptance by conduct)
- §1741 (silence as acceptance)

**Legal Analysis Criteria:**
- [ ] Addresses conduct vs explicit acceptance
- [ ] Applies facts to legal standard
- [ ] Discusses practical implications
- [ ] Provides confidence assessment

---

### Test 1.3: Invalid Contracts
**Query:**
```json
{
  "question": "Under what circumstances is a contract void from the beginning (ab initio)?",
  "topK": 10
}
```

**Expected Provisions:**
- §580 (absolute invalidity)
- §588 (relative invalidity)
- §1729 (indefiniteness)
- §1746 (illegality)

**Legal Analysis Criteria:**
- [ ] Distinguishes void vs voidable
- [ ] Lists all grounds for invalidity
- [ ] Explains consequences
- [ ] Addresses remedies

---

## Test Suite 2: Legal Capacity (§15-§99)

### Test 2.1: Minor's Legal Capacity
**Query:**
```json
{
  "question": "Can a 16-year-old enter into a binding contract without parental consent?",
  "facts": {
    "age": 16,
    "contract_type": "employment contract",
    "parental_consent": false
  }
}
```

**Expected Provisions:**
- §30 (age of majority)
- §31 (partial capacity of minors)
- §32 (emancipation)
- §35 (contracts by minors)

**Legal Analysis Criteria:**
- [ ] Identifies age of majority (18)
- [ ] Explains exceptions for minors
- [ ] Applies to employment context
- [ ] Addresses validity issues

---

### Test 2.2: Legal Incapacity
**Query:**
```json
{
  "question": "What happens to a contract signed by a person who was later declared legally incapacitated?",
  "facts": {
    "timing": "contract signed before court declaration",
    "contract_value": "significant",
    "other_party": "acted in good faith"
  }
}
```

**Expected Provisions:**
- §57 (legal incapacity)
- §586 (invalidity due to incapacity)
- §589 (protection of good faith parties)

**Legal Analysis Criteria:**
- [ ] Addresses timing issue (before vs after declaration)
- [ ] Discusses good faith protection
- [ ] Explains retroactive effects
- [ ] Provides practical guidance

---

## Test Suite 3: Consent and Will (§34-§98)

### Test 3.1: Written Consent Requirements
**Query:**
```json
{
  "question": "When is written consent required by law, and what are the consequences of missing it?",
  "topK": 10
}
```

**Expected Provisions:**
- §34 (expression of will)
- §94 (form of consent)
- §96 (written form requirement)
- §97 (electronic consent)

**Legal Analysis Criteria:**
- [ ] Lists situations requiring written consent
- [ ] Explains formal requirements
- [ ] Discusses electronic signatures
- [ ] Addresses consequences of non-compliance

---

### Test 3.2: Defects in Consent (Mistake)
**Query:**
```json
{
  "question": "If I signed a contract based on a fundamental mistake about the subject matter, can I void it?",
  "facts": {
    "mistake_type": "believed property had building permit",
    "reality": "no building permit exists",
    "other_party": "did not know about mistake"
  }
}
```

**Expected Provisions:**
- §583 (mistake/error)
- §584 (essential vs non-essential mistake)
- §585 (time limits for invoking mistake)

**Legal Analysis Criteria:**
- [ ] Defines essential mistake
- [ ] Applies to building permit scenario
- [ ] Discusses reasonableness
- [ ] Addresses time limits and remedies

---

### Test 3.3: Duress and Coercion
**Query:**
```json
{
  "question": "What constitutes duress that would invalidate a contract?",
  "facts": {
    "threat": "threatened to reveal embarrassing information",
    "harm_type": "reputational damage",
    "contract": "sale of property below market value"
  }
}
```

**Expected Provisions:**
- §587 (duress)
- §588 (types of threats)

**Legal Analysis Criteria:**
- [ ] Defines legal duress
- [ ] Distinguishes economic vs physical threats
- [ ] Applies to reputational harm
- [ ] Explains burden of proof

---

## Test Suite 4: Property Rights (§976-§1105)

### Test 4.1: Ownership Acquisition
**Query:**
```json
{
  "question": "How does one acquire ownership of real property in Czech law?",
  "topK": 10
}
```

**Expected Provisions:**
- §976 (concept of ownership)
- §980 (modes of acquisition)
- §1099 (transfer by legal act)
- §1105 (registration requirement)

**Legal Analysis Criteria:**
- [ ] Lists all modes of acquisition
- [ ] Explains registration requirement
- [ ] Distinguishes movable vs immovable property
- [ ] Discusses timing of ownership transfer

---

### Test 4.2: Good Faith Acquisition
**Query:**
```json
{
  "question": "Can I acquire ownership from a non-owner if I acted in good faith?",
  "facts": {
    "purchased_from": "person who did not own the item",
    "buyer_knowledge": "believed seller was owner",
    "property_type": "movable property (car)"
  }
}
```

**Expected Provisions:**
- §1040 (good faith acquisition)
- §1041 (requirements for protection)
- §1045 (exceptions)

**Legal Analysis Criteria:**
- [ ] Explains good faith principle
- [ ] Lists requirements
- [ ] Applies to car purchase scenario
- [ ] Notes exceptions (stolen property)

---

## Test Suite 5: Complex Fact Patterns

### Test 5.1: Multi-Issue Contract Dispute
**Query:**
```json
{
  "question": "Analyze the validity and enforceability of this contract situation",
  "facts": {
    "parties": "17-year-old seller, adult buyer",
    "subject": "sale of smartphone for 15,000 CZK",
    "agreement": "oral only, no written contract",
    "payment": "buyer paid, seller now refuses to deliver",
    "parent_knowledge": "seller's parents unaware of transaction"
  }
}
```

**Expected Legal Issues:**
1. Minor's capacity (§31-35)
2. Form requirements (§559-564)
3. Contract formation (§1724-1725)
4. Performance obligations (§1914)
5. Remedies for breach

**Legal Analysis Criteria:**
- [ ] Identifies all legal issues
- [ ] Analyzes each issue systematically
- [ ] Weighs competing factors
- [ ] Provides practical recommendation
- [ ] Assesses likelihood of success

---

### Test 5.2: Defect in Consent with Third Party
**Query:**
```json
{
  "question": "What are the legal options in this situation?",
  "facts": {
    "contract": "sale of apartment",
    "seller_claim": "signed under duress from relative",
    "timing": "2 years have passed since signing",
    "buyer": "purchased in good faith, already renovated",
    "current_status": "buyer living in apartment"
  }
}
```

**Expected Legal Issues:**
1. Duress claim (§587-588)
2. Time limits (§585)
3. Good faith buyer protection (§589)
4. Remedies (damages vs rescission)
5. Balance of interests

**Legal Analysis Criteria:**
- [ ] Addresses statute of limitations issue
- [ ] Weighs good faith protection
- [ ] Discusses proportionality
- [ ] Evaluates strength of duress claim
- [ ] Recommends course of action

---

## Test Suite 6: Edge Cases and Exceptions

### Test 6.1: Electronic Contracts
**Query:**
```json
{
  "question": "Is an email exchange sufficient to form a binding contract?",
  "facts": {
    "communication": "email only",
    "content": "clear offer and acceptance",
    "signatures": "typed names only",
    "contract_value": "50,000 CZK service contract"
  }
}
```

**Expected Provisions:**
- §97 (electronic form)
- §1725 (offer and acceptance)
- §1759 (consumer contracts)

**Legal Analysis Criteria:**
- [ ] Explains electronic signature requirements
- [ ] Distinguishes qualified vs simple signatures
- [ ] Applies to service contract
- [ ] Notes any consumer protection issues

---

### Test 6.2: Implied Terms
**Query:**
```json
{
  "question": "What terms are implied into a contract even if not explicitly stated?",
  "facts": {
    "contract": "lease agreement",
    "explicit_terms": "rent amount and duration only",
    "dispute": "maintenance responsibilities unclear"
  }
}
```

**Expected Provisions:**
- §1746 (implied terms)
- Trade customs provisions
- Good faith and fair dealing

**Legal Analysis Criteria:**
- [ ] Explains sources of implied terms
- [ ] Applies to lease context
- [ ] Discusses gap-filling rules
- [ ] References trade practices

---

## Test Suite 7: Comparison and Consistency Tests

### Test 7.1: Consistency Check - Same Topic, Different Phrasing
**Query A:**
```json
{
  "question": "When is a contract invalid?"
}
```

**Query B:**
```json
{
  "question": "What makes a contract void?"
}
```

**Query C:**
```json
{
  "question": "Grounds for contract invalidity in Czech law"
}
```

**Test:** All three should retrieve substantially the same provisions (§580-589)

---

### Test 7.2: Specificity Test - General vs Specific
**Query A (General):**
```json
{
  "question": "Contract law basics"
}
```

**Query B (Specific):**
```json
{
  "question": "What is consideration in contract formation?"
}
```

**Test:** Specific query should return more focused, relevant provisions

---

## Evaluation Criteria

### Retrieval Quality (Vector Search)
- **Precision**: Are retrieved sections actually relevant?
- **Recall**: Are all relevant sections retrieved?
- **Ranking**: Are most relevant sections ranked highest?
- **Coverage**: Does search span related concepts?

### Synthesis Quality (LLM Analysis)
- **Accuracy**: Is the legal reasoning correct?
- **Completeness**: Are all relevant issues addressed?
- **Clarity**: Is the explanation understandable?
- **Citations**: Are all statements properly cited?
- **Confidence**: Does it acknowledge uncertainty appropriately?

### Practical Utility
- **Actionability**: Can a lawyer use this to advise clients?
- **Risk Assessment**: Does it identify potential issues?
- **Alternatives**: Does it suggest different approaches?
- **Time Saved**: Is this faster than manual research?

---

## Scoring System

For each test:
- ✅ **Pass**: Retrieves correct provisions, sound reasoning, practical utility
- ⚠️ **Partial**: Some relevant provisions missed, reasoning mostly sound
- ❌ **Fail**: Wrong provisions, flawed reasoning, not useful

**Overall System Assessment:**
- 90-100% Pass: Production-ready for legal research
- 70-89% Pass: Useful with lawyer supervision
- 50-69% Pass: Needs significant improvement
- <50% Pass: Proof of concept only

---

## Testing Protocol

### Step 1: Execute Each Query
```bash
curl -X POST https://legal-topology.jhaladik.workers.dev/api/synthesize \
  -H "Content-Type: application/json" \
  -d @test_query.json \
  -o test_result.json
```

### Step 2: Manual Review
For each result:
1. Check statutory foundation citations
2. Verify legal reasoning accuracy
3. Assess practical applicability
4. Compare to expected provisions
5. Note any gaps or errors

### Step 3: Document Findings
For each test:
- Record what was retrieved
- Evaluate synthesis quality
- Note strengths and weaknesses
- Score: ✅ / ⚠️ / ❌

### Step 4: Summary Report
- Overall pass rate
- Common failure patterns
- System strengths
- Areas for improvement
- Production readiness assessment

---

## Current Limitations

**Known Constraints (59% indexed):**
- Only §1-~650 currently indexed
- Some tests will fail due to missing sections
- Insurance law tests (§2758+) cannot be run yet
- Full evaluation requires 100% indexing

**Tests We Can Run Now:**
- ✅ Legal capacity (§15-99)
- ✅ Consent and will (§34-98)
- ✅ Some contract formation (§1724-1766) - if indexed
- ❌ Property rights (§976-1105) - not yet indexed
- ❌ Insurance law (§2758+) - not yet indexed

---

## Next Steps

1. **Run available tests** on currently indexed sections
2. **Document results** systematically
3. **Wait for full indexing** to complete remaining tests
4. **Retest** after Supreme Court decisions added
5. **Compare results** before/after judicial overlay

---

## Expected Outcome

This test suite will demonstrate:
1. Whether semantic search finds correct legal provisions
2. Whether LLM synthesis produces sound legal analysis
3. Whether the system is trustworthy for legal professionals
4. Where the system needs improvement
5. What the limits of vector-based legal reasoning are

**Ultimate Question:** Can a lawyer ethically rely on this system for client advice, or is it just a research assistant?