import type { NextConfig } from "next";

/**
 * Aucun hôte distant n'est autorisé : tous les visuels du site sont servis
 * depuis /public. Les photos du catalogue partenaire portaient un filigrane
 * « FridayParts® » et ne sont donc pas reprises — seules les références et
 * fiches techniques le sont.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
