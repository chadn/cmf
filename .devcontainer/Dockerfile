FROM ubuntu:22.04

# Prevent interactive tzdata prompts
ENV DEBIAN_FRONTEND=noninteractive

# Disable apt cleanup hooks that can fail under BuildKit
RUN rm -f /etc/apt/apt.conf.d/docker-clean || true && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache

# Safe, robust install
RUN apt-get update || true && \
    apt-get install -y --no-install-recommends \
      git \
      curl \
      libatomic1 \
      ca-certificates \
      locales && \
    locale-gen en_US.UTF-8 && \
    rm -rf /var/lib/apt/lists/*
