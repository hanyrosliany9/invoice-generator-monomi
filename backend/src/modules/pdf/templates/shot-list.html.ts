/**
 * Shot List PDF Template
 * Detailed shot list with camera information and descriptions
 */

import { escapeHtml } from "./escape-html.util";

export function generateShotListHTML(shotList: any): string {
  const scenes: any[] = shotList.scenes || [];
  const scenesHtml = scenes.length === 0
    ? '<p style="color:#9ca3af; font-style:italic; padding:16px 0;">No scenes have been added yet.</p>'
    : scenes
    .map(
      (scene: any) => {
        const shots: any[] = scene.shots || [];
        const shotsBody = shots.length === 0
          ? '<tr><td colspan="7" style="color:#9ca3af; font-style:italic; text-align:center;">No shots added for this scene.</td></tr>'
          : shots.map(
              (shot: any) => `
            <tr>
              <td>${escapeHtml(shot.shotNumber)}</td>
              <td>${escapeHtml(shot.shotSize) || "-"}</td>
              <td>${escapeHtml(shot.shotType) || "-"}</td>
              <td>${escapeHtml(shot.cameraMovement) || "-"}</td>
              <td>${escapeHtml(shot.lens) || "-"}</td>
              <td>${escapeHtml(shot.description) || "-"}</td>
              <td>${escapeHtml(shot.status)}</td>
            </tr>
          `,
            ).join("");
        return `
    <div class="scene">
      <div class="scene-header">
        <strong>${escapeHtml(scene.sceneNumber)}</strong> - ${escapeHtml(scene.name)}
        ${scene.intExt ? `(${escapeHtml(scene.intExt)})` : ""}
        ${scene.dayNight ? `/ ${escapeHtml(scene.dayNight)}` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Size</th>
            <th>Type</th>
            <th>Movement</th>
            <th>Lens</th>
            <th>Description</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${shotsBody}
        </tbody>
      </table>
    </div>
  `;
      }
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 10px; }
        .meta { color: #666; margin-bottom: 20px; font-size: 10px; }
        .scene { margin-bottom: 20px; page-break-inside: avoid; }
        .scene-header { background: #1f2937; color: #fff; padding: 8px 12px; font-size: 12px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; font-size: 10px; }
        td { font-size: 10px; }
        tr:nth-child(even) { background: #fafafa; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(shotList.name)}</h1>
      <div class="meta">
        Project: ${escapeHtml(shotList.project?.name || "N/A")} |
        Created: ${new Date(shotList.createdAt).toLocaleDateString()}
      </div>
      ${scenesHtml}
    </body>
    </html>
  `;
}
