FROM telegraf:1.40.3
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*
COPY battery/requirements.txt /opt/battery/requirements.txt
RUN python3 -m venv /opt/battery/venv \
    && /opt/battery/venv/bin/pip install --no-cache-dir -r /opt/battery/requirements.txt
COPY battery/ /opt/battery/
