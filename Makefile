
default:
		@echo "\n\033[1;31mmake deps\033[0m       Installs dependencies & performs cleanup"
		@echo "\033[1;31mmake tests\033[0m      Runs the Unit & Integration tests\n"

deps:
		@npm install
		@./tools/remove-sys-notice

tests:
		@./node_modules/vows/bin/vows --spec ./test/unit/*.js