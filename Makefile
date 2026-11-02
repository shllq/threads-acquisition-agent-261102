URL ?= $(filter https://%,$(MAKECMDGOALS))
export THREADS_URL := $(URL)
URL_GOALS := $(subst :,\:,$(filter https://%,$(MAKECMDGOALS)))

.PHONY: help test agent acquire probe $(URL_GOALS)

help:
	@printf '%s\n' 'make test' 'make agent <URL>   # all four assignment fields' 'make acquire <URL>' 'make probe <URL>' 'For URLs containing =, use: make agent URL="https://..."'

test:
	@npm test

agent acquire probe:
	@set -eu; \
	if [ "$(words $(URL))" -ne 1 ]; then echo 'Provide exactly one URL: make $@ <URL>' >&2; exit 1; fi; \
	output="artifacts/$@-$$(date +%Y%m%d-%H%M%S)"; \
	mkdir -p artifacts; mkdir "$$output"; \
	printf 'Artifacts: %s\n' "$$output" >&2; \
	message="$$THREADS_URL"; \
	if [ "$@" = agent ]; then message="請取得這篇 Threads 作者的個人檔案名稱、追蹤者數量、貼文內容及續文：$$THREADS_URL"; fi; \
	npm run --silent $@ -- "$$message" "$$output"

# A positional URL is a second make goal, not another command to execute.
ifneq ($(strip $(URL_GOALS)),)
$(URL_GOALS):
	@:
endif
