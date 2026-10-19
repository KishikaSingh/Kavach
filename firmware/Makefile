# Runs the firmware logic tests on your PC (no ESP32 needed). Needs g++.
#   make test
CXX      ?= g++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -O1
SRC      := smart_helmet
TESTS    := test_detector_flow test_payloads test_sim800
BUILD    := $(SRC)/tests/build

.PHONY: test clean
test: $(addprefix run_,$(TESTS))

$(BUILD):
	mkdir -p $(BUILD)

$(BUILD)/%: $(SRC)/tests/%.cpp $(wildcard $(SRC)/*.h) $(wildcard $(SRC)/tests/*.h) | $(BUILD)
	$(CXX) $(CXXFLAGS) $< -o $@

run_%: $(BUILD)/%
	@echo "== $* =="
	@$<

clean:
	rm -rf $(BUILD)

# Writes what the firmware really sends to Firebase, for the app tests (npm test reads it).
FIXTURE := ../frontend/tests/fixtures/firmware-payloads.json
.PHONY: fixtures
fixtures: $(BUILD)
	$(CXX) $(CXXFLAGS) $(SRC)/tests/dump_payloads.cpp -o $(BUILD)/dump_payloads
	$(BUILD)/dump_payloads > $(FIXTURE)
	@echo wrote $(FIXTURE)
