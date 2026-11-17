/**
 * Collision System: High-precision 2D Circle-to-AABB collision detection
 * and resolution with normal vector calculation and positional correction.
 */

import { Ball, CollisionResult } from './types';

export class CollisionSystem {
  /**
   * Circle vs Axis-Aligned Bounding Box (AABB) intersection check
   * Returns exact contact face, normal vector, and penetration depth.
   */
  static testCircleAABB(
    ball: Ball,
    boxX: number,
    boxY: number,
    boxW: number,
    boxH: number
  ): CollisionResult {
    // 1. Find nearest point on the rectangle to the circle's center
    const nearestX = Math.max(boxX, Math.min(ball.x, boxX + boxW));
    const nearestY = Math.max(boxY, Math.min(ball.y, boxY + boxH));

    // 2. Vector from nearest point to circle center
    const dx = ball.x - nearestX;
    const dy = ball.y - nearestY;
    const distSq = dx * dx + dy * dy;

    // Check if within circle radius
    if (distSq > ball.radius * ball.radius) {
      return {
        collided: false,
        normalX: 0,
        normalY: 0,
        penetrationDepth: 0,
        contactPointX: 0,
        contactPointY: 0,
        face: 'none',
      };
    }

    const dist = Math.sqrt(distSq);

    // If circle center is strictly inside the box (rare tunneling edge case)
    if (dist === 0) {
      // Find shortest ejection path
      const overlapLeft = ball.x - boxX;
      const overlapRight = boxX + boxW - ball.x;
      const overlapTop = ball.y - boxY;
      const overlapBottom = boxY + boxH - ball.y;

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapTop) {
        return {
          collided: true,
          normalX: 0,
          normalY: -1,
          penetrationDepth: ball.radius + overlapTop,
          contactPointX: ball.x,
          contactPointY: boxY,
          face: 'top',
        };
      } else if (minOverlap === overlapBottom) {
        return {
          collided: true,
          normalX: 0,
          normalY: 1,
          penetrationDepth: ball.radius + overlapBottom,
          contactPointX: ball.x,
          contactPointY: boxY + boxH,
          face: 'bottom',
        };
      } else if (minOverlap === overlapLeft) {
        return {
          collided: true,
          normalX: -1,
          normalY: 0,
          penetrationDepth: ball.radius + overlapLeft,
          contactPointX: boxX,
          contactPointY: ball.y,
          face: 'left',
        };
      } else {
        return {
          collided: true,
          normalX: 1,
          normalY: 0,
          penetrationDepth: ball.radius + overlapRight,
          contactPointX: boxX + boxW,
          contactPointY: ball.y,
          face: 'right',
        };
      }
    }

    // Normal points outward from the box toward the ball
    const normalX = dx / dist;
    const normalY = dy / dist;
    const penetrationDepth = ball.radius - dist;

    // Determine primary face struck
    let face: 'top' | 'bottom' | 'left' | 'right' | 'corner' = 'corner';
    const absNx = Math.abs(normalX);
    const absNy = Math.abs(normalY);

    if (absNy > 0.85) {
      face = normalY < 0 ? 'top' : 'bottom';
    } else if (absNx > 0.85) {
      face = normalX < 0 ? 'left' : 'right';
    } else {
      face = 'corner';
    }

    return {
      collided: true,
      normalX,
      normalY,
      penetrationDepth,
      contactPointX: nearestX,
      contactPointY: nearestY,
      face,
    };
  }

  /**
   * Resolve reflection across a normal vector with elasticity
   */
  static reflectVelocity(
    vx: number,
    vy: number,
    normalX: number,
    normalY: number,
    elasticity = 1.0
  ): { vx: number; vy: number } {
    // Dot product: v . n
    const dot = vx * normalX + vy * normalY;

    // Only reflect if moving toward each other (dot < 0)
    if (dot >= 0) {
      return { vx, vy };
    }

    // Reflection formula: v' = v - (1 + e) * (v . n) * n
    const factor = (1 + elasticity) * dot;
    return {
      vx: vx - factor * normalX,
      vy: vy - factor * normalY,
    };
  }
}
