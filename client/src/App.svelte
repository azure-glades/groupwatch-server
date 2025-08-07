<script>
  import { onMount } from 'svelte';
  import { io } from 'socket.io-client';

  let room = '';
  let socket;
  let joined = false;
  let localStream = null;
  let peers = {};        // { peerId: RTCPeerConnection }
  let remoteVideos = {}; // { peerId: MediaStream }
  let chatText = '';
  let messages = [];

  onMount(() => {
    socket = io();

    socket.on('user-joined', peerId => handleNewPeer(peerId));
    socket.on('signal', ({ sender, data }) => handleSignal(sender, data));
    socket.on('chat', ({ text }) => {
      messages = [...messages, { who: 'Friend', text }];
    });
  });

  /* ---------- room ---------- */
  async function joinRoom() {
    if (!room.trim()) return;
    socket.emit('join-room', room);
    joined = true;
    //await startScreenShare();        // 1️⃣ wait until we actually have media
    socket.emit('ready', room);      // 2️⃣ tell others we’re ready
  }

  /* ---------- screen ---------- */
  async function startScreenShare() {
    localStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  }

  /* ---------- signalling ---------- */
  function handleNewPeer(peerId) {
    if (peers[peerId]) return;               // already have one
    const pc = createPeer(peerId);
    peers[peerId] = pc;

    localStream?.getTracks().forEach(t => pc.addTrack(t, localStream));

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => socket.emit('signal', { room, data: pc.localDescription, target: peerId }));
  }

  function handleSignal(sender, data) {
    if (!peers[sender]) peers[sender] = createPeer(sender); // callee side

    const pc = peers[sender];

    // SDP (offer or answer)
    if (data.type && data.sdp) {
      pc.setRemoteDescription(data)
        .then(() => {
          if (data.type === 'offer') {
            localStream?.getTracks().forEach(t => pc.addTrack(t, localStream));
            return pc.createAnswer()
              .then(answer => pc.setLocalDescription(answer))
              .then(() => socket.emit('signal', { room, data: pc.localDescription, target: sender }));
          }
        })
        .catch(console.error);
    } else if (data.candidate) {
      pc.addIceCandidate(data.candidate).catch(console.error);
    }
  }

  function createPeer(peerId) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.onicecandidate = e => {
      if (e.candidate)
        socket.emit('signal', { room, data: { candidate: e.candidate }, target: peerId });
    };
    pc.ontrack = e => {
      remoteVideos[peerId] = e.streams[0];
      remoteVideos = remoteVideos; // re-trigger Svelte
    };
    return pc;
  }

  /* ---------- chat ---------- */
  function sendChat() {
    if (!chatText.trim()) return;
    messages = [...messages, { who: 'Me', text: chatText }];
    socket.emit('chat', { room, text: chatText });
    chatText = '';
  }

  /* ---------- helper for <video> ---------- */
  function srcObject(node, stream) {
    node.srcObject = stream;
    return { update(s) { node.srcObject = s; } };
  }
</script>

<main>
  {#if !joined}
    <h1>Group Watch</h1>
    <input bind:value={room} placeholder="Room name" />
    <button on:click={joinRoom}>Join / Create</button>
  {:else}
    <h1>Room: {room}</h1>
    <button on:click={startScreenShare} disabled={localStream}>
      {localStream ? 'Sharing' : 'Share screen'}
    </button>
    <div style="display:flex; gap:1rem; flex-wrap:wrap;">
      {#each Object.entries(remoteVideos) as [id, stream]}
        <video autoplay playsinline use:srcObject={stream} width="300" />
        <p>Peer {id.slice(-4)}</p>
      {/each}
    </div>

    <div>
      <ul>
        {#each messages as m}
          <li><strong>{m.who}:</strong> {m.text}</li>
        {/each}
      </ul>
      <input bind:value={chatText} on:keydown={e => e.key === 'Enter' && sendChat()} />
      <button on:click={sendChat}>Send</button>
    </div>
  {/if}
</main>

<style>main{font-family:sans-serif;padding:1rem}</style>