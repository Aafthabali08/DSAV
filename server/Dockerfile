FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 gcc g++ gdb openjdk-17-jdk-headless nodejs ca-certificates && rm -rf /var/lib/apt/lists/*
ENV LANG=C.UTF-8
COPY runtime /opt/sortscope
RUN gcc -shared -fPIC /opt/sortscope/io_redirect.c -o /opt/sortscope/io_redirect.so
RUN javac -encoding UTF-8 --add-modules jdk.jdi /opt/sortscope/JavaTracer.java
WORKDIR /work
USER 65534:65534
ENTRYPOINT ["python3", "/opt/sortscope/run.py"]
