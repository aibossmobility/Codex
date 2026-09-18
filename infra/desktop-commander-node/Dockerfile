FROM node:22-bookworm-slim

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends util-linux ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV BROWSER=echo
WORKDIR /workspace

ENTRYPOINT []
CMD ["script","-qec","npx -y @wonderwhy-er/desktop-commander@latest remote","/dev/null"]
