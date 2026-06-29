"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Menu,
  MessageSquareText,
  Send,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  X,
} from "lucide-react";
import * as THREE from "three";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type LockerRoomSide = "home" | "away" | "neutral";
export type LockerRoomPosition = "GK" | "DEF" | "MID" | "FWD";

export type LockerRoomParticipant = {
  id: string;
  name: string;
  rank: number;
  points: number;
  side: LockerRoomSide;
  position: LockerRoomPosition;
  confidence: number;
  take: string;
};

export type LockerRoomMatch = {
  competition: string;
  timeLabel: string;
  groupLabel: string;
  homeTeam: string;
  awayTeam: string;
  scoreLabel: string;
  chanceLabel: string;
  homeFlagCode: string;
  awayFlagCode: string;
  homeRankLabel: string;
  awayRankLabel: string;
};

type LockerRoomProps = {
  match: LockerRoomMatch;
  participants: LockerRoomParticipant[];
  poolHref: string;
};

type PositionedPlayer = LockerRoomParticipant & {
  coordinates: { x: number; y: number };
};

type LockerRoomChatMessage = {
  id: string;
  name: string;
  side: LockerRoomSide;
  body: string;
};

type ActiveSpeechBubble = LockerRoomChatMessage & {
  coordinates: { x: number; y: number };
};

const FIELD_WIDTH = 24;
const FIELD_LENGTH = 36;
const MAX_PITCH_PLAYERS_PER_SIDE = 11;

const SIDE_STYLES = {
  home: {
    jersey: "bg-[#d82d3a] text-white ring-white/40",
    chip: "border-[#ff6b75]/35 bg-[#d82d3a]/18 text-white",
    glow: "shadow-[0_0_32px_rgb(216_45_58_/_0.35)]",
    color: "#d82d3a",
  },
  away: {
    jersey: "bg-[#0d7143] text-white ring-white/40",
    chip: "border-[#31d989]/35 bg-[#0d7143]/20 text-white",
    glow: "shadow-[0_0_32px_rgb(13_113_67_/_0.35)]",
    color: "#0d7143",
  },
  neutral: {
    jersey: "bg-zinc-950 text-white ring-white/40",
    chip: "border-white/25 bg-white/10 text-white",
    glow: "shadow-[0_0_32px_rgb(255_255_255_/_0.14)]",
    color: "#20242b",
    label: "Scout",
  },
} as const;

const FIELD_SLOTS: Record<
  LockerRoomSide,
  Record<LockerRoomPosition, { x: number; y: number }[]>
> = {
  home: {
    GK: [{ x: 8, y: 50 }],
    DEF: [
      { x: 20, y: 24 },
      { x: 20, y: 50 },
      { x: 20, y: 76 },
    ],
    MID: [
      { x: 35, y: 32 },
      { x: 35, y: 58 },
      { x: 42, y: 44 },
      { x: 42, y: 70 },
    ],
    FWD: [
      { x: 48, y: 28 },
      { x: 50, y: 54 },
      { x: 48, y: 78 },
    ],
  },
  away: {
    GK: [{ x: 92, y: 50 }],
    DEF: [
      { x: 80, y: 24 },
      { x: 80, y: 50 },
      { x: 80, y: 76 },
    ],
    MID: [
      { x: 65, y: 32 },
      { x: 65, y: 58 },
      { x: 58, y: 44 },
      { x: 58, y: 70 },
    ],
    FWD: [
      { x: 52, y: 28 },
      { x: 50, y: 54 },
      { x: 52, y: 78 },
    ],
  },
  neutral: {
    GK: [{ x: 50, y: 9 }],
    DEF: [
      { x: 34, y: 9 },
      { x: 66, y: 9 },
      { x: 24, y: 91 },
    ],
    MID: [
      { x: 44, y: 91 },
      { x: 56, y: 91 },
      { x: 76, y: 91 },
      { x: 50, y: 9 },
    ],
    FWD: [
      { x: 40, y: 9 },
      { x: 60, y: 9 },
      { x: 50, y: 91 },
    ],
  },
};

const POSITION_OPTIONS: { value: LockerRoomPosition; label: string }[] = [
  { value: "GK", label: "Keeper" },
  { value: "DEF", label: "Defender" },
  { value: "MID", label: "Midfield" },
  { value: "FWD", label: "Forward" },
];

const MESSAGE_PRESETS = [
  "Receipts are open.",
  "First goal decides it.",
  "I want chaos.",
  "This side has the room.",
];

function starterChatMessages(match: LockerRoomMatch): LockerRoomChatMessage[] {
  return [
    {
      id: "chat-1",
      name: "Patryk",
      side: "home",
      body: `${match.homeTeam} has to press early.`,
    },
    {
      id: "chat-2",
      name: "Pawel",
      side: "away",
      body: `${match.awayTeam} only needs one counter.`,
    },
    {
      id: "chat-3",
      name: "Joseph",
      side: "home",
      body: `${match.groupLabel} is still wide open.`,
    },
  ];
}

function sideLabel(side: LockerRoomSide, match: LockerRoomMatch) {
  if (side === "home") return match.homeTeam;
  if (side === "away") return match.awayTeam;
  return SIDE_STYLES.neutral.label;
}

function playerCoordinates(
  player: LockerRoomParticipant,
  indexByPosition: Map<string, number>,
) {
  const key = `${player.side}:${player.position}`;
  const index = indexByPosition.get(key) ?? 0;
  indexByPosition.set(key, index + 1);

  const slots = FIELD_SLOTS[player.side][player.position];
  const base = slots[index % slots.length];
  const row = Math.floor(index / slots.length);
  const direction = player.side === "away" ? -1 : 1;
  const offset = row * 3.8;

  return {
    x: Math.max(5, Math.min(95, base.x + offset * direction)),
    y: Math.max(8, Math.min(92, base.y + (row % 2 === 0 ? 0 : 4))),
  };
}

function toWorldPosition(coordinates: { x: number; y: number }) {
  return {
    x: ((coordinates.x - 50) / 50) * (FIELD_LENGTH / 2),
    z: ((coordinates.y - 50) / 50) * (FIELD_WIDTH / 2),
  };
}

function sidelineCoordinates(index: number) {
  const perSideline = 12;
  const row = Math.floor(index / perSideline);
  const slot = index % perSideline;
  const rowOffset = Math.floor(row / 2) * 4;
  const y = row % 2 === 0 ? 4 + rowOffset : 96 - rowOffset;

  return {
    x: 7 + slot * (86 / Math.max(1, perSideline - 1)),
    y,
  };
}

function makeFieldTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1365;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#2f7a45";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? "#347f4b" : "#2b7041";
    ctx.fillRect((canvas.width / 12) * i, 0, canvas.width / 12, canvas.height);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.76)";
  ctx.lineWidth = 12;
  ctx.strokeRect(74, 74, canvas.width - 148, canvas.height - 148);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 74);
  ctx.lineTo(canvas.width / 2, canvas.height - 74);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 146, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.fill();

  ctx.strokeRect(74, canvas.height / 2 - 210, 240, 420);
  ctx.strokeRect(canvas.width - 314, canvas.height / 2 - 210, 240, 420);
  ctx.strokeRect(74, canvas.height / 2 - 98, 92, 196);
  ctx.strokeRect(canvas.width - 166, canvas.height / 2 - 98, 92, 196);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function playerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function createPlayerLabel(player: PositionedPlayer) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "rgba(5, 11, 9, 0.82)";
  ctx.roundRect(10, 18, 300, 92, 24);
  ctx.fill();
  ctx.strokeStyle = player.id === "current-user" ? "#b3e802" : SIDE_STYLES[player.side].color;
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Arial";
  ctx.textAlign = "center";
  ctx.fillText(player.id === "current-user" ? "YOU" : `#${player.rank}`, 160, 58);
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "700 22px Arial";
  ctx.fillText(playerInitials(player.name), 160, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(0, 1.95, 0);
  sprite.scale.set(1.35, 0.54, 1);
  return sprite;
}

function addCapsule(
  group: THREE.Group,
  radius: number,
  length: number,
  material: THREE.Material,
  position: THREE.Vector3,
  rotation: THREE.Euler,
) {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, length, 6, 14),
    material,
  );
  mesh.position.copy(position);
  mesh.rotation.copy(rotation);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function createPlayerMesh(player: PositionedPlayer) {
  const group = new THREE.Group();
  const world = toWorldPosition(player.coordinates);
  const color = SIDE_STYLES[player.side].color;
  const accent =
    player.side === "home"
      ? "#ffffff"
      : player.side === "away"
        ? "#f5cf32"
        : "#9fb0bd";
  const isUser = player.id === "current-user";
  const isFeatured = isUser || player.rank <= 5;
  const kitMaterial = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.38,
    metalness: 0.12,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.42,
    metalness: 0.04,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: "#f5d2b8",
    roughness: 0.72,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({
    color: "#111719",
    roughness: 0.58,
    metalness: 0.05,
  });
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: isUser ? "#b3e802" : color,
    transparent: true,
    opacity: isUser ? 0.92 : 0.58,
    side: THREE.DoubleSide,
  });

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.56, 7, 16),
    kitMaterial,
  );
  torso.position.y = 0.86;
  torso.scale.set(1.18, 1.0, 0.72);
  torso.castShadow = true;
  group.add(torso);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.09, 0.035),
    accentMaterial,
  );
  stripe.position.set(0, 1.02, 0.19);
  stripe.castShadow = true;
  group.add(stripe);

  const crest = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 18),
    new THREE.MeshBasicMaterial({ color: accent }),
  );
  crest.position.set(-0.14, 1.14, 0.205);
  group.add(crest);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 22, 22),
    skinMaterial,
  );
  head.position.y = 1.42;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.48),
    darkMaterial,
  );
  hair.position.set(0, 1.5, 0);
  hair.castShadow = true;
  group.add(hair);

  const shorts = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.18, 0.32),
    darkMaterial,
  );
  shorts.position.y = 0.47;
  shorts.castShadow = true;
  group.add(shorts);

  addCapsule(
    group,
    0.055,
    0.43,
    kitMaterial,
    new THREE.Vector3(-0.33, 0.86, 0),
    new THREE.Euler(0.18, 0, -0.32),
  );
  addCapsule(
    group,
    0.055,
    0.43,
    kitMaterial,
    new THREE.Vector3(0.33, 0.86, 0),
    new THREE.Euler(0.18, 0, 0.32),
  );
  addCapsule(
    group,
    0.06,
    0.48,
    accentMaterial,
    new THREE.Vector3(-0.14, 0.21, 0.02),
    new THREE.Euler(0.08, 0, 0.08),
  );
  addCapsule(
    group,
    0.06,
    0.48,
    accentMaterial,
    new THREE.Vector3(0.14, 0.21, 0.02),
    new THREE.Euler(0.08, 0, -0.08),
  );

  const leftBoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.08, 0.26),
    darkMaterial,
  );
  leftBoot.position.set(-0.14, 0.02, 0.07);
  leftBoot.castShadow = true;
  group.add(leftBoot);

  const rightBoot = leftBoot.clone();
  rightBoot.position.x = 0.14;
  group.add(rightBoot);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(isUser ? 0.5 : 0.39, isUser ? 0.58 : 0.45, 40),
    glowMaterial,
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.03;
  group.add(marker);

  if (isFeatured) {
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(isUser ? 0.72 : 0.55, 0.018, 8, 48),
      new THREE.MeshBasicMaterial({
        color: isUser ? "#b3e802" : color,
        transparent: true,
        opacity: isUser ? 0.62 : 0.28,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.06;
    group.add(halo);

    const label = createPlayerLabel(player);
    if (label) group.add(label);
  }

  group.position.set(world.x, 0, world.z);
  group.userData = { playerId: player.id };
  return group;
}

function createSidelineMesh(player: PositionedPlayer) {
  const group = new THREE.Group();
  const world = toWorldPosition(player.coordinates);
  const sideColor = SIDE_STYLES[player.side].color;
  const hoodieMaterial = new THREE.MeshStandardMaterial({
    color:
      player.side === "home"
        ? "#7f2028"
        : player.side === "away"
          ? "#164b34"
          : "#2c333a",
    roughness: 0.7,
    metalness: 0.02,
  });
  const sideAccentMaterial = new THREE.MeshStandardMaterial({
    color: sideColor,
    roughness: 0.62,
    metalness: 0.04,
  });
  const pantsMaterial = new THREE.MeshStandardMaterial({
    color: "#151b20",
    roughness: 0.78,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: "#f5d2b8",
    roughness: 0.72,
  });
  const shoeMaterial = new THREE.MeshStandardMaterial({
    color: "#0b0f12",
    roughness: 0.62,
  });

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.58, 7, 16),
    hoodieMaterial,
  );
  torso.position.y = 0.86;
  torso.scale.set(1.18, 1.04, 0.78);
  torso.castShadow = true;
  group.add(torso);

  const pocket = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.12, 0.035),
    sideAccentMaterial,
  );
  pocket.position.set(0, 0.78, 0.2);
  pocket.castShadow = true;
  group.add(pocket);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 22, 22),
    skinMaterial,
  );
  head.position.y = 1.43;
  head.castShadow = true;
  group.add(head);

  const hood = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.055, 8, 24),
    hoodieMaterial,
  );
  hood.position.set(0, 1.35, -0.04);
  hood.rotation.x = Math.PI / 2;
  hood.castShadow = true;
  group.add(hood);

  addCapsule(
    group,
    0.055,
    0.43,
    hoodieMaterial,
    new THREE.Vector3(-0.33, 0.86, 0),
    new THREE.Euler(0.2, 0, -0.28),
  );
  addCapsule(
    group,
    0.055,
    0.43,
    hoodieMaterial,
    new THREE.Vector3(0.33, 0.86, 0),
    new THREE.Euler(0.2, 0, 0.28),
  );
  addCapsule(
    group,
    0.07,
    0.55,
    pantsMaterial,
    new THREE.Vector3(-0.12, 0.22, 0.02),
    new THREE.Euler(0.04, 0, 0.04),
  );
  addCapsule(
    group,
    0.07,
    0.55,
    pantsMaterial,
    new THREE.Vector3(0.12, 0.22, 0.02),
    new THREE.Euler(0.04, 0, -0.04),
  );

  const leftShoe = new THREE.Mesh(
    new THREE.BoxGeometry(0.17, 0.07, 0.25),
    shoeMaterial,
  );
  leftShoe.position.set(-0.12, 0.02, 0.07);
  leftShoe.castShadow = true;
  group.add(leftShoe);

  const rightShoe = leftShoe.clone();
  rightShoe.position.x = 0.12;
  group.add(rightShoe);

  const sidelineDot = new THREE.Mesh(
    new THREE.RingGeometry(0.32, 0.37, 32),
    new THREE.MeshBasicMaterial({
      color: sideColor,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  sidelineDot.rotation.x = -Math.PI / 2;
  sidelineDot.position.y = 0.03;
  group.add(sidelineDot);

  group.position.set(world.x, 0, world.z);
  group.scale.setScalar(0.82);
  group.userData = { playerId: player.id, sideline: true };
  return group;
}

function LockerRoomScene({
  pitchPlayers,
  sidelinePlayers,
  cheerSide,
}: {
  pitchPlayers: PositionedPlayer[];
  sidelinePlayers: PositionedPlayer[];
  cheerSide: LockerRoomSide | null;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const mountElement = mount;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#07140f");
    scene.fog = new THREE.Fog("#07140f", 28, 60);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 15.5, 21.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("data-locker-room-canvas", "true");
    renderer.domElement.style.display = "block";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.inset = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mountElement.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#eaffd5", "#082016", 2.2);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#ffffff", 3.5);
    keyLight.position.set(-8, 18, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#7cf0ff", 1.4);
    rimLight.position.set(10, 10, -14);
    scene.add(rimLight);

    const fieldTexture = makeFieldTexture();
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_LENGTH, FIELD_WIDTH),
      new THREE.MeshStandardMaterial({
        map: fieldTexture ?? undefined,
        color: fieldTexture ? "#ffffff" : "#317a45",
        roughness: 0.82,
      }),
    );
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    const pitchGroup = new THREE.Group();
    pitchGroup.add(field);

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({
        color: "#f7f7ef",
        roughness: 0.38,
      }),
    );
    ball.position.set(0, 0.24, 0);
    ball.castShadow = true;
    pitchGroup.add(ball);

    const playerGroup = new THREE.Group();
    pitchPlayers.forEach((player) => playerGroup.add(createPlayerMesh(player)));
    pitchGroup.add(playerGroup);

    const sidelineGroup = new THREE.Group();
    sidelinePlayers.forEach((player) =>
      sidelineGroup.add(createSidelineMesh(player)),
    );
    pitchGroup.add(sidelineGroup);

    const cheerGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD_LENGTH / 2, FIELD_WIDTH),
      new THREE.MeshBasicMaterial({
        color: cheerSide ? SIDE_STYLES[cheerSide].color : "#ffffff",
        transparent: true,
        opacity: cheerSide ? 0.2 : 0,
        blending: THREE.AdditiveBlending,
      }),
    );
    cheerGlow.rotation.x = -Math.PI / 2;
    cheerGlow.position.set(cheerSide === "away" ? FIELD_LENGTH / 4 : -FIELD_LENGTH / 4, 0.04, 0);
    pitchGroup.add(cheerGlow);
    scene.add(pitchGroup);

    function resize() {
      const rect = mountElement.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, true);
      camera.aspect = rect.width / Math.max(1, rect.height);
      camera.updateProjectionMatrix();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mountElement);
    resize();

    let frame = 0;
    let animationId = 0;
    function animate() {
      frame += 0.01;
      playerGroup.children.forEach((child, index) => {
        child.position.y = Math.sin(frame * 2 + index) * 0.045;
        child.rotation.y = Math.sin(frame + index * 0.4) * 0.16;
      });
      sidelineGroup.children.forEach((child, index) => {
        child.position.y = Math.sin(frame * 1.2 + index) * 0.025;
        child.rotation.y = Math.sin(frame * 0.75 + index * 0.35) * 0.08;
      });
      ball.position.x = Math.sin(frame * 0.8) * 0.7;
      ball.position.z = Math.cos(frame * 0.8) * 0.45;
      pitchGroup.rotation.y = Math.sin(frame * 0.12) * 0.012;
      camera.position.x = Math.sin(frame * 0.09) * 0.35;
      camera.position.y = 15.5 + Math.sin(frame * 0.07) * 0.12;
      camera.position.z = 21.5 + Math.cos(frame * 0.08) * 0.18;
      camera.lookAt(Math.sin(frame * 0.08) * 0.18, 0, Math.cos(frame * 0.07) * 0.16);
      renderer.render(scene, camera);
      animationId = window.requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      fieldTexture?.dispose();
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const objectMaterials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          objectMaterials.forEach((material) => materials.add(material));
        }
        if (object instanceof THREE.Sprite) {
          materials.add(object.material);
          if (object.material.map) textures.add(object.material.map);
        }
      });
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [pitchPlayers, sidelinePlayers, cheerSide]);

  return <div ref={mountRef} className="absolute inset-0" />;
}

export function LockerRoom({ match, participants, poolHref }: LockerRoomProps) {
  const [selectedSide, setSelectedSide] = useState<LockerRoomSide>("home");
  const [selectedPosition, setSelectedPosition] =
    useState<LockerRoomPosition>("MID");
  const [message, setMessage] = useState(MESSAGE_PRESETS[0]);
  const [draftMessage, setDraftMessage] = useState("");
  const [chatMessages, setChatMessages] = useState(() =>
    starterChatMessages(match),
  );
  const [activeBubbles, setActiveBubbles] = useState<ActiveSpeechBubble[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cheerSide, setCheerSide] = useState<LockerRoomSide | null>(null);
  const [cheerCount, setCheerCount] = useState({ home: 18, away: 14 });

  const { pitchPlayers, sidelinePlayers } = useMemo(() => {
    const userPlayer: LockerRoomParticipant = {
      id: "current-user",
      name: "You",
      rank: 0,
      points: 0,
      side: selectedSide,
      position: selectedPosition,
      confidence: 88,
      take: message,
    };
    const pitchParticipants: LockerRoomParticipant[] = [];
    const sidelineParticipants: LockerRoomParticipant[] = [];
    const pitchCounts: Record<"home" | "away", number> = {
      home: selectedSide === "home" ? 1 : 0,
      away: selectedSide === "away" ? 1 : 0,
    };

    participants.forEach((player) => {
      if (player.side === "neutral") {
        sidelineParticipants.push(player);
        return;
      }

      if (pitchCounts[player.side] < MAX_PITCH_PLAYERS_PER_SIDE) {
        pitchParticipants.push(player);
        pitchCounts[player.side] += 1;
        return;
      }

      sidelineParticipants.push(player);
    });

    const userIsOnPitch = selectedSide !== "neutral";
    const scenePitchParticipants = userIsOnPitch
      ? [userPlayer, ...pitchParticipants]
      : pitchParticipants;
    const sceneSidelineParticipants = userIsOnPitch
      ? sidelineParticipants
      : [userPlayer, ...sidelineParticipants];
    const indexByPosition = new Map<string, number>();

    return {
      pitchPlayers: scenePitchParticipants.map((player) => ({
        ...player,
        coordinates: playerCoordinates(player, indexByPosition),
      })),
      sidelinePlayers: sceneSidelineParticipants.map((player, index) => ({
        ...player,
        coordinates: sidelineCoordinates(index),
      })),
    };
  }, [message, participants, selectedPosition, selectedSide]);

  const sideCounts = participants.reduce(
    (counts, player) => {
      counts[player.side] += 1;
      return counts;
    },
    { home: 0, away: 0, neutral: 0 },
  );
  const totalCheer = cheerCount.home + cheerCount.away;
  const homeEnergy = Math.round((cheerCount.home / totalCheer) * 100);
  const awayEnergy = 100 - homeEnergy;

  function cheer(side: "home" | "away") {
    setCheerCount((current) => ({ ...current, [side]: current[side] + 1 }));
    setCheerSide(side);
    window.setTimeout(() => setCheerSide(null), 950);
  }

  function sendChatMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draftMessage.trim();
    if (!body) return;
    const id = `chat-${Date.now()}`;
    const speaker = [...pitchPlayers, ...sidelinePlayers].find(
      (player) => player.id === "current-user",
    );
    const speakerCoordinates = speaker?.coordinates ?? { x: 50, y: 56 };
    const bubble: ActiveSpeechBubble = {
      id,
      name: "You",
      side: selectedSide,
      body,
      coordinates: {
        x: Math.max(6, Math.min(94, speakerCoordinates.x)),
        y: Math.max(8, Math.min(92, speakerCoordinates.y)),
      },
    };

    setChatMessages((current) =>
      [
        ...current,
        {
          id,
          name: "You",
          side: selectedSide,
          body,
        },
      ].slice(-5),
    );
    setActiveBubbles((current) => [...current, bubble].slice(-2));
    setMessage(body);
    setDraftMessage("");
    window.setTimeout(() => {
      setActiveBubbles((current) =>
        current.filter((item) => item.id !== bubble.id),
      );
    }, 4800);
  }

  return (
    <main className="fixed inset-x-0 bottom-0 top-16 isolate overflow-hidden bg-[#07140f] text-white">
      <LockerRoomScene
        pitchPlayers={pitchPlayers}
        sidelinePlayers={sidelinePlayers}
        cheerSide={cheerSide}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,transparent_0_34%,rgb(0_0_0_/_0.18)_66%,rgb(0_0_0_/_0.66)_100%)]" />

      <header className="absolute inset-x-0 top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-3 sm:p-5">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-lg border border-white/12 bg-black/36 text-white shadow-2xl backdrop-blur-md hover:bg-white/14 hover:text-white"
        >
          <Link href={poolHref} aria-label="Back to pool">
            <ArrowLeft />
          </Link>
        </Button>

        <div className="mx-auto flex min-w-0 max-w-[25rem] items-center justify-center gap-2 rounded-lg border border-white/12 bg-black/36 px-2.5 py-2 shadow-2xl backdrop-blur-md sm:px-3">
          <TeamFlag code={match.homeFlagCode} name={match.homeTeam} />
          <div className="min-w-0 px-1 text-center">
            <p className="truncate text-[0.68rem] font-semibold uppercase text-white/62">
              {match.competition} - {match.timeLabel}
            </p>
            <h1 className="mt-1 truncate font-heading text-base leading-none text-white sm:text-lg">
              {match.homeTeam}{" "}
              <span className="text-cta-green">{match.scoreLabel}</span>{" "}
              {match.awayTeam}
            </h1>
            <p className="mt-1 truncate text-[0.68rem] font-semibold uppercase text-cta-green/80">
              {match.chanceLabel}
            </p>
          </div>
          <TeamFlag code={match.awayFlagCode} name={match.awayTeam} />
        </div>

        <div className="justify-self-end rounded-lg border border-white/12 bg-black/36 p-2 shadow-2xl backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/14 hover:text-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Open pitch menu"
          >
            <Menu />
          </Button>
        </div>
      </header>

      <section className="absolute bottom-3 left-3 right-3 z-20 grid gap-2 sm:bottom-5 sm:left-5 sm:right-auto sm:w-[21rem]">
        <div className="rounded-lg border border-white/12 bg-[#06110d] p-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-white/62">
            <span>{match.homeTeam}</span>
            <span>Energy</span>
            <span>{match.awayTeam}</span>
          </div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-white/12">
            <div className="bg-[#d82d3a]" style={{ width: `${homeEnergy}%` }} />
            <div className="bg-[#0d7143]" style={{ width: `${awayEnergy}%` }} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondaryGreen" size="sm" onClick={() => cheer("home")}>
              <Volume2 />
              {match.homeTeam}
            </Button>
            <Button type="button" variant="secondaryGreen" size="sm" onClick={() => cheer("away")}>
              <Volume2 />
              {match.awayTeam}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/12 bg-[#06110d] p-2.5 shadow-2xl backdrop-blur-md">
          <div className="grid gap-2 sm:flex sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-white/62">
                Your avatar
              </p>
              <p className="mt-1 truncate text-sm font-semibold">
                {sideLabel(selectedSide, match)} {selectedPosition}
              </p>
            </div>
            <Badge
              className={cn(
                "max-w-full justify-self-start sm:max-w-[13rem]",
                SIDE_STYLES[selectedSide].chip,
              )}
              variant="outline"
            >
              <span className="truncate">{message}</span>
            </Badge>
          </div>
        </div>
      </section>

      <section className="absolute bottom-[11.75rem] right-3 z-20 w-[min(24rem,calc(100vw-1.5rem))] rounded-lg border border-white/12 bg-[#06110d] p-3 shadow-2xl backdrop-blur-md sm:bottom-5 sm:right-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareText className="size-4 text-cta-green" />
            <p className="text-xs font-semibold uppercase text-white/62">
              Live chat
            </p>
          </div>
          <Badge variant="outline" className="border-white/18 bg-white/8 text-white">
            Mock
          </Badge>
        </div>
        <div className="grid max-h-32 gap-2 overflow-hidden">
          {chatMessages.slice(-3).map((item) => (
            <div key={item.id} className="rounded-md border border-white/10 bg-white/7 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-white">
                  {item.name}
                </span>
                <span className={cn("size-2 rounded-full", item.side === "away" ? "bg-[#0d7143]" : item.side === "home" ? "bg-[#d82d3a]" : "bg-white/50")} />
              </div>
              <p className="mt-1 truncate text-xs text-white/68">{item.body}</p>
            </div>
          ))}
        </div>
        <form className="mt-2 flex gap-2" onSubmit={sendChatMessage}>
          <input
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder="Talk into the room"
            className="min-w-0 flex-1 rounded-md border border-white/12 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-white/42 focus:border-cta-green"
          />
          <Button type="submit" variant="primaryGreen" size="icon" aria-label="Send message">
            <Send />
          </Button>
        </form>
      </section>

      <PlayerBubbleLayer bubbles={activeBubbles} />

      <aside
        className={cn(
          "absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-[25rem] translate-x-full flex-col border-l border-white/12 bg-[#08130f]/90 text-white shadow-2xl backdrop-blur-xl transition-transform duration-300",
          menuOpen && "translate-x-0",
        )}
        aria-hidden={!menuOpen}
      >
        <header className="flex items-center justify-between border-b border-white/12 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-white/54">
              Pitch menu
            </p>
            <h2 className="font-heading text-2xl leading-none text-white">
              Match controls
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/14 hover:text-white"
            onClick={() => setMenuOpen(false)}
            aria-label="Close pitch menu"
          >
            <X />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <MenuSection title="Choose side">
            <SegmentedControl
              options={[
                { label: match.homeTeam, value: "home" },
                { label: match.awayTeam, value: "away" },
                { label: "Scout", value: "neutral" },
              ]}
              value={selectedSide}
              onChange={(value) => setSelectedSide(value as LockerRoomSide)}
            />
          </MenuSection>

          <MenuSection title="Position">
            <div className="grid grid-cols-2 gap-2">
              {POSITION_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={selectedPosition === option.value ? "primaryGreen" : "outline"}
                  className={cn(
                    selectedPosition !== option.value &&
                      "border-white/14 bg-white/8 text-white hover:bg-white/14 hover:text-white",
                  )}
                  onClick={() => setSelectedPosition(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </MenuSection>

          <MenuSection title="Bubble">
            <div className="grid gap-2">
              {MESSAGE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={message === preset ? "secondaryGreen" : "outline"}
                  className={cn(
                    "justify-between",
                    message !== preset &&
                      "border-white/14 bg-white/8 text-white hover:bg-white/14 hover:text-white",
                  )}
                  onClick={() => setMessage(preset)}
                >
                  <span className="truncate">{preset}</span>
                  <ChevronRight />
                </Button>
              ))}
            </div>
          </MenuSection>

          <MenuSection title="Room pulse">
            <RoomPulse
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              sideCounts={sideCounts}
            />
          </MenuSection>

          <MenuSection title="Talk track">
            <TalkTrack match={match} participants={participants} />
          </MenuSection>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close pitch menu"
          className="absolute inset-0 z-20 bg-black/28"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </main>
  );
}

function TeamFlag({
  code,
  name,
  className,
}: {
  code: string;
  name: string;
  className?: string;
}) {
  if (!code) {
    return (
      <div
        className={cn(
          "grid h-8 w-11 place-items-center rounded border border-white/24 bg-white/10 text-xs font-bold uppercase text-white/72 shadow-sm",
          className,
        )}
      >
        {name.slice(0, 2)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      alt={`${name} flag`}
      className={cn("h-8 w-11 rounded border border-white/24 object-cover shadow-sm", className)}
    />
  );
}

function PlayerBubbleLayer({ bubbles }: { bubbles: ActiveSpeechBubble[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {bubbles.slice(-2).map((bubble, index) => (
        <div
          key={bubble.id}
          className="locker-speaking-bubble absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${bubble.coordinates.x}%`,
            top: `${Math.max(9, bubble.coordinates.y - 6)}%`,
            animationDelay: `${index * 0.42}s`,
          }}
        >
          <div
            className={cn(
              "w-28 rounded-md border border-white/14 bg-black/38 px-2 py-1.5 text-center text-[0.63rem] font-semibold leading-tight text-white shadow-2xl backdrop-blur-md sm:w-32 sm:text-[0.68rem]",
              SIDE_STYLES[bubble.side].glow,
            )}
          >
            <span className="block truncate text-white/58">{bubble.name}</span>
            {bubble.body}
            <span className="mt-1 flex justify-center gap-1" aria-hidden="true">
              <span className="locker-speaking-dot" />
              <span className="locker-speaking-dot [animation-delay:120ms]" />
              <span className="locker-speaking-dot [animation-delay:240ms]" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 rounded-lg border border-white/14 bg-white/8 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cn(
            "min-h-9 rounded-md px-2 text-xs font-semibold text-white/68 transition-colors",
            value === option.value && "bg-cta-green text-cta-green-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-white/12 px-4 py-4">
      <p className="mb-3 text-xs font-semibold uppercase text-white/54">{title}</p>
      {children}
    </section>
  );
}

function RoomPulse({
  homeTeam,
  awayTeam,
  sideCounts,
}: {
  homeTeam: string;
  awayTeam: string;
  sideCounts: Record<LockerRoomSide, number>;
}) {
  const total = sideCounts.home + sideCounts.away + sideCounts.neutral;

  return (
    <div className="grid gap-2">
      {[
        { side: "home" as const, label: homeTeam, count: sideCounts.home, icon: Trophy },
        { side: "away" as const, label: awayTeam, count: sideCounts.away, icon: Shield },
        { side: "neutral" as const, label: "Scouts", count: sideCounts.neutral, icon: Users },
      ].map((item) => (
        <div
          key={item.side}
          className="flex items-center justify-between rounded-lg border border-white/12 bg-white/8 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <item.icon className="size-4 text-white/62" />
            <Badge className={SIDE_STYLES[item.side].chip} variant="outline">
              {item.label}
            </Badge>
          </div>
          <span className="font-semibold text-white">
            {item.count}
            <span className="ml-1 text-xs font-normal text-white/50">/ {total}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function TalkTrack({
  match,
  participants,
}: {
  match: LockerRoomMatch;
  participants: LockerRoomParticipant[];
}) {
  return (
    <div className="grid gap-2">
      <div className="rounded-lg border border-white/12 bg-white/8 px-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Sparkles className="size-4 text-cta-green" />
          Receipt bait
        </div>
        <p className="mt-2 text-sm leading-5 text-white/62">
          Top bubbles can become saved receipts once live events are wired in.
        </p>
      </div>
      {participants.slice(0, 6).map((player) => (
        <div key={player.id} className="rounded-lg border border-white/12 bg-white/8 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate font-semibold text-white">{player.name}</p>
            <Badge className={SIDE_STYLES[player.side].chip} variant="outline">
              {sideLabel(player.side, match)}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-5 text-white/68">{player.take}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-white/48">
            <MessageSquareText className="size-3" />
            {player.position}
            <BadgeCheck className="ml-2 size-3" />
            {player.confidence}% confidence
          </div>
        </div>
      ))}
    </div>
  );
}
