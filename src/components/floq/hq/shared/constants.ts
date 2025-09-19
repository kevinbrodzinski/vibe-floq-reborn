import React from "react";
import { MapPin, MessageSquare, CalendarCheck, Camera, Radio, BarChart3, Shield, Sparkles } from "lucide-react";

export const TABS = [
  { k: "map", l: "Map", i: React.createElement(MapPin, { className: "h-4 w-4" }) },
  { k: "stream", l: "Stream", i: React.createElement(MessageSquare, { className: "h-4 w-4" }) },
  { k: "plan", l: "Plan", i: React.createElement(CalendarCheck, { className: "h-4 w-4" }) },
  { k: "moments", l: "Moments", i: React.createElement(Camera, { className: "h-4 w-4" }) },
  { k: "pulse", l: "Pulse", i: React.createElement(Radio, { className: "h-4 w-4" }) },
  { k: "venues", l: "Venues", i: React.createElement(MapPin, { className: "h-4 w-4" }) },
  { k: "analytics", l: "Analytics", i: React.createElement(BarChart3, { className: "h-4 w-4" }) },
  { k: "wing", l: "Wing", i: React.createElement(Sparkles, { className: "h-4 w-4" }) },
  { k: "privacy", l: "Privacy", i: React.createElement(Shield, { className: "h-4 w-4" }) }
] as const;

export type TabKey = typeof TABS[number]["k"];

export const PEOPLE = [
  { n: "Sarah", d: "Café • Chill", v: 60 },
  { n: "Tom", d: "Downtown • Hype", v: 85 },
  { n: "Alex", d: "Beach→Venice", v: 80 },
  { n: "You", d: "Home • Neutral", v: 45 }
];

export const VENUES = [
  { r: 1, name: "Gran Blanco", meta: "Bar • Downtown · Last: 2 days", note: "Our unofficial headquarters", badge: "47× 👑" },
  { r: 2, name: "Café Nero", meta: "Coffee • Venice · Last: 1 week", note: "Perfect for hangover recovery", badge: "31×" },
  { r: 3, name: "Venice Beach", meta: "Outdoor • Beach · Last: 2 weeks", note: "Beach volleyball crew", badge: "28×" }
];