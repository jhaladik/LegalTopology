#!/bin/bash

# Legal Topology Test Suite Runner
# Compares old (synthesize-multi) vs new (topology/synthesize) endpoints

API_URL="https://legal-topology.jhaladik.workers.dev"
RESULTS_DIR="./test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS_DIR/$TIMESTAMP"

echo "================================"
echo "Legal Topology Test Suite"
echo "Timestamp: $TIMESTAMP"
echo "================================"

# Function to run single test
run_test() {
  local test_id=$1
  local question=$2
  local endpoint=$3
  local output_file=$4

  echo "  Testing $test_id on $endpoint..."

  curl -s -X POST "$API_URL$endpoint" \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"$question\", \"topK\": 15}" \
    > "$output_file" 2>&1

  # Check if request succeeded
  if [ $? -eq 0 ]; then
    echo "    ✓ Response received"
  else
    echo "    ✗ Request failed"
  fi
}

# Function to test single-issue cases
test_single_issues() {
  echo ""
  echo "=== SINGLE ISSUE TESTS ==="
  echo ""

  # SI-01: Unauthorized Subletting - Enrichment
  echo "SI-01: Unauthorized Subletting - Enrichment"
  QUESTION="Pronajímám byt za 20,000 Kč. Zjistil jsem, že nájemce ho bez mého souhlasu podnajímá za 40,000 Kč. Můžu požadovat rozdíl?"
  run_test "SI-01" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/SI-01_old.json"
  run_test "SI-01" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/SI-01_new.json"

  # SI-02: Partnership Profit Distribution
  echo "SI-02: Partnership Profit Distribution"
  QUESTION="S partnerem podnikáme. Letos jsme měli zisk 500,000 Kč. Jak se má rozdělit, když smlouva neříká nic o podílech?"
  run_test "SI-02" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/SI-02_old.json"
  run_test "SI-02" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/SI-02_new.json"

  # SI-03: Adverse Possession
  echo "SI-03: Adverse Possession - Time Element"
  QUESTION="Soused používá mou cestu přes pozemek už 12 let bez mého souhlasu. Může tvrdit, že má právo cesty?"
  run_test "SI-03" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/SI-03_old.json"
  run_test "SI-03" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/SI-03_new.json"

  # SI-04: Simple Lease Termination
  echo "SI-04: Simple Lease Termination"
  QUESTION="Nájemce mi neplatí nájem už 3 měsíce. Můžu vypovědět nájem okamžitě?"
  run_test "SI-04" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/SI-04_old.json"
  run_test "SI-04" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/SI-04_new.json"

  # SI-05: Contract Defects
  echo "SI-05: Contract Defects - Withdrawal"
  QUESTION="Koupil jsem auto za 300,000 Kč. Po týdnu jsem zjistil závažnou vadu, o které prodávající věděl, ale neřekl mi to. Můžu odstoupit?"
  run_test "SI-05" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/SI-05_old.json"
  run_test "SI-05" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/SI-05_new.json"
}

# Function to test multi-issue cases
test_multi_issues() {
  echo ""
  echo "=== MULTI ISSUE TESTS ==="
  echo ""

  # MI-01: Airbnb Complex
  echo "MI-01: Airbnb Subletting - Complex"
  QUESTION="Pronajímám byt v Praze za 25,000 Kč měsíčně. Po 6 měsících jsem zjistil, že nájemce byt bez mého souhlasu podnajímá turistům přes Airbnb za 3,000 Kč/noc (obsazenost cca 20 dní měsíčně = 60,000 Kč). Sousedi si stěžují na hluk, SVJ mi hrozí pokutou 50,000 Kč. Mám kauci 50,000 Kč."
  run_test "MI-01" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/MI-01_old.json"
  run_test "MI-01" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/MI-01_new.json"

  # MI-02: Property Defects + Adverse Possession
  echo "MI-02: Property Defects + Adverse Possession"
  QUESTION="Koupil jsem dům s vadami za 5M. Soused chodí přes můj pozemek 13 let. Co mám dělat?"
  run_test "MI-02" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/MI-02_old.json"
  run_test "MI-02" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/MI-02_new.json"

  # MI-03: Partnership + Unauthorized Use
  echo "MI-03: Partnership + Unauthorized Use"
  QUESTION="S kolegou podnikáme společně. Zjistil jsem, že bez mého vědomí používá firemní auto na soukromé účely a pronajímá ho za 5,000 Kč/měsíc. Jak rozdělit zisk z podnikání a co s autem?"
  run_test "MI-03" "$QUESTION" "/api/synthesize-multi" "$RESULTS_DIR/$TIMESTAMP/MI-03_old.json"
  run_test "MI-03" "$QUESTION" "/api/topology/synthesize" "$RESULTS_DIR/$TIMESTAMP/MI-03_new.json"
}

# Run all tests
test_single_issues
test_multi_issues

echo ""
echo "================================"
echo "Tests completed!"
echo "Results saved to: $RESULTS_DIR/$TIMESTAMP"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Review JSON results in $RESULTS_DIR/$TIMESTAMP"
echo "2. Run: node analyze-results.js $TIMESTAMP"
echo ""