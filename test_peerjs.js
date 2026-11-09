import { Peer } from "peerjs";

console.log("Testing PeerJS connectivity...");
const testRoomCode = "TEST" + Math.floor(Math.random() * 900 + 100);
const hostPeerId = `skr-test-${testRoomCode}`;

console.log(`Creating Host Peer: ${hostPeerId}...`);
const hostPeer = new Peer(hostPeerId, {
  debug: 1,
});

hostPeer.on("open", (id) => {
  console.log(`✓ Host Peer registered successfully with ID: ${id}`);

  console.log("Creating Client Peer...");
  const clientPeer = new Peer(`skr-client-${Date.now()}`, { debug: 1 });

  clientPeer.on("open", (clientId) => {
    console.log(`✓ Client Peer registered with ID: ${clientId}`);
    console.log(`Client connecting to Host: ${hostPeerId}...`);
    const conn = clientPeer.connect(hostPeerId);

    conn.on("open", () => {
      console.log("✓ WebRTC DataChannel connection OPENED between Client and Host!");
      conn.send({ type: "HELLO_FROM_CLIENT", message: "Hi Host!" });
    });
  });

  hostPeer.on("connection", (conn) => {
    console.log("✓ Host received incoming connection from:", conn.peer);
    conn.on("data", (data) => {
      console.log("✓ Host received data from client:", data);
      conn.send({ type: "WELCOME_FROM_HOST", message: "Welcome to SketchRoom!" });
      setTimeout(() => {
        console.log("🎉 PeerJS WebRTC P2P TEST PASSED 100%! 🎉");
        hostPeer.destroy();
        process.exit(0);
      }, 500);
    });
  });
});

hostPeer.on("error", (err) => {
  console.error("Host Peer Error:", err);
  process.exit(1);
});
