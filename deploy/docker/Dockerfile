FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends bash ca-certificates curl tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/opensparrow

COPY vendor/linux-openclaw ./vendor/linux-openclaw
COPY scripts/openclaw-usb ./scripts/openclaw-usb
COPY ui ./ui
COPY deploy/docker ./deploy/docker

RUN chmod +x ./scripts/openclaw-usb/*.sh ./deploy/docker/bin/*.sh \
    && ln -sf /opt/opensparrow/deploy/docker/bin/openclaw-wrapper.sh /usr/local/bin/openclaw

ENV HOME=/var/opensparrow/home \
    OPENCLAW_HOME=/var/opensparrow/home \
    OPENCLAW_PROFILE=container-baseline \
    OPENCLAW_GATEWAY_PORT=18889 \
    OPENCLAW_GATEWAY_BIND=lan \
    OPENSPARROW_UI_PORT=19000 \
    OPENSPARROW_AUTO_OPEN=0 \
    USB_RUNTIME_ROOT=/opt/opensparrow/runtime \
    LOG_DIR=/var/opensparrow/logs \
    EVIDENCE_ROOT=/var/opensparrow/evidence

VOLUME ["/var/opensparrow/home", "/var/opensparrow/logs", "/var/opensparrow/evidence"]

EXPOSE 19000 18889

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/opt/opensparrow/deploy/docker/bin/run-core.sh"]

