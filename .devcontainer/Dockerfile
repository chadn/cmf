FROM node:22-bullseye
# node v22.21.0
# npm 10.9.4

# Optional locale setup
RUN apt-get update && \
    apt-get install -y locales && \
    locale-gen en_US.UTF-8 && \
    rm -rf /var/lib/apt/lists/*

# Install additional OS packages. lsof to see which process is using a port
# lsof -iTCP:9323 -sTCP:LISTEN 
RUN apt-get install -y less vim lsof

ENV LANG=en_US.UTF-8
ENV DEBIAN_FRONTEND=noninteractive

# Optionally install and run claude 
# docker exec -it $(docker ps | grep vsc-cmf | awk '{print $1}') bash
# npm install -g @anthropic-ai/claude-code
# IS_SANDBOX=1 claude --dangerously-skip-permissions
