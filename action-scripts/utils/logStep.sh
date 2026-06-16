#!/bin/bash

logStep() {
  local type="INFO"
  local msg="$1"
  if [[ "$1" =~ ^(INFO|SUCCESS|ERROR|WARN)$ ]]; then
    type="$1"
    msg="$2"
  fi

  local time_stamp=$(date +"%H:%M:%S")
  local clean_msg=$(echo "$msg" | sed 's/\x1b\[[0-9;]*m//g')
  local total_len=$(( ${#clean_msg} + 16 ))

  # Warna ANSI Bash
  local CYAN='\033[0;36m'
  local GREEN='\033[0;32m'
  local YELLOW='\033[1;33m'
  local RED='\033[0;31m'
  local GRAY='\033[0;90m'
  local BOLD='\033[1;37m'
  local NC='\033[0m'

  local badge="${CYAN}[INFO]${NC}"
  [[ "$type" == "SUCCESS" ]] && badge="${GREEN}[SUCCESS]${NC}"
  [[ "$type" == "WARN" ]] && badge="${YELLOW}[WARN]${NC}"
  [[ "$type" == "ERROR" ]] && badge="${RED}[ERROR]${NC}"

  printf -v line '%*s' "$total_len" ""
  echo -e "\n${GRAY}${line// /═}${NC}"
  echo -e "${GRAY}[$time_stamp]${NC} ${badge} ${BOLD}${msg}${NC}"
  echo -e "${GRAY}${line// /─}${NC}"
}
