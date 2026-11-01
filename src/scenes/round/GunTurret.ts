import Phaser from "phaser";

import type { ArenaBounds, StickState } from "./types";

export class GunTurret {
  private scene: Phaser.Scene;
  private bounds: ArenaBounds;

  // 銃の配置座標（アリーナ底辺の中央）
  public readonly x: number;
  public readonly y: number;

  // 銃の角度（ラジアン）: -PI/2 (真上) を基準
  public angle: number = -Math.PI / 2;

  // 角度の可動範囲（真上を中心に左右約75度: -165度 〜 -15度）
  private readonly minAngle: number = Phaser.Math.DegToRad(-165);
  private readonly maxAngle: number = Phaser.Math.DegToRad(-15);

  // 旋回速度（rad/s）: 最大倒し時で約120度/秒
  private readonly rotationSpeed: number = Math.PI * 0.95;

  // バレルの長さ（銃口までのオフセット）
  public readonly barrelLength: number = 48;

  // コンポーネント
  public container: Phaser.GameObjects.Container;
  private barrelContainer: Phaser.GameObjects.Container;
  private barrelGraphics: Phaser.GameObjects.Graphics;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private laserSight: Phaser.GameObjects.Graphics;

  // キーボード
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private adKeys?: {
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, bounds: ArenaBounds) {
    this.scene = scene;
    this.bounds = bounds;

    // アリーナ底辺の中央
    this.x = bounds.left + bounds.size / 2;
    this.y = bounds.bottom - 10;

    this.container = this.scene.add.container(this.x, this.y).setDepth(80);

    // 1. レーザーサイト（照準ガイド線）
    this.laserSight = this.scene.add.graphics().setDepth(70);

    // 2. 台座ベースグラフィックス（回転しない）
    this.baseGraphics = this.scene.add.graphics();
    this.drawBase();
    this.container.add(this.baseGraphics);

    // 3. 回転するバレルコンテナ
    this.barrelContainer = this.scene.add.container(0, 0);
    this.barrelGraphics = this.scene.add.graphics();
    this.drawBarrel();
    this.barrelContainer.add(this.barrelGraphics);
    this.container.add(this.barrelContainer);

    this.updateRotation();

    // キーボード設定
    if (this.scene.input.keyboard) {
      this.cursors = this.scene.input.keyboard.createCursorKeys();
      this.adKeys = {
        A: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        D: this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
  }

  private drawBase(): void {
    this.baseGraphics.clear();

    // メタリックベースの外枠
    this.baseGraphics.fillStyle(0x0f172a, 1.0);
    this.baseGraphics.fillCircle(0, 0, 36);
    this.baseGraphics.lineStyle(3, 0x1e293b, 1.0);
    this.baseGraphics.strokeCircle(0, 0, 36);

    // ネオンリング
    this.baseGraphics.lineStyle(2, 0x0284c7, 0.8);
    this.baseGraphics.strokeCircle(0, 0, 26);

    // コアプレート
    this.baseGraphics.fillStyle(0x1e293b, 1.0);
    this.baseGraphics.fillCircle(0, 0, 16);
    this.baseGraphics.lineStyle(2, 0x38bdf8, 1.0);
    this.baseGraphics.strokeCircle(0, 0, 16);
  }

  private drawBarrel(): void {
    this.barrelGraphics.clear();

    // 銃身（バレル本体）: 長さ48px、幅16px
    this.barrelGraphics.fillStyle(0x1e293b, 1.0);
    this.barrelGraphics.fillRoundedRect(0, -9, 42, 18, 4);
    this.barrelGraphics.lineStyle(2, 0x38bdf8, 1.0);
    this.barrelGraphics.strokeRoundedRect(0, -9, 42, 18, 4);

    // マズル先端
    this.barrelGraphics.fillStyle(0x0284c7, 1.0);
    this.barrelGraphics.fillRoundedRect(38, -6, 10, 12, 3);
    this.barrelGraphics.lineStyle(1.5, 0x38bdf8, 1.0);
    this.barrelGraphics.strokeRoundedRect(38, -6, 10, 12, 3);

    // エネルギーコアライン
    this.barrelGraphics.fillStyle(0x38bdf8, 0.9);
    this.barrelGraphics.fillRect(8, -2, 28, 4);
  }

  public update(
    deltaSeconds: number,
    stickState: StickState,
    autoAimTargetPos?: { x: number; y: number } | null,
  ): void {
    // スティックの左右入力（x成分: -1.0 〜 +1.0）
    let horizontalInput = stickState.x;

    // キーボードの左右（A / D, Left / Right）
    if (this.cursors && this.adKeys) {
      if (this.cursors.left.isDown || this.adKeys.A.isDown) horizontalInput -= 1.0;
      if (this.cursors.right.isDown || this.adKeys.D.isDown) horizontalInput += 1.0;
    }

    horizontalInput = Phaser.Math.Clamp(horizontalInput, -1.0, 1.0);

    // スティック操作またはキー操作がある場合
    if (Math.abs(horizontalInput) > 0.05) {
      // スティック右 (x > 0) -> 角度を右（時計回り）に増やす
      // スティック左 (x < 0) -> 角度を左（反時計回り）に減らす
      this.angle += horizontalInput * this.rotationSpeed * deltaSeconds;
    } else if (autoAimTargetPos) {
      // 入力がない場合のオートエイム旋回
      const targetAngle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        autoAimTargetPos.x,
        autoAimTargetPos.y,
      );
      // 目標角度に向けて滑らかに補間
      const diff = Phaser.Math.Angle.Wrap(targetAngle - this.angle);
      const step = this.rotationSpeed * deltaSeconds * 1.2;
      if (Math.abs(diff) < step) {
        this.angle = targetAngle;
      } else {
        this.angle += Math.sign(diff) * step;
      }
    }

    // 角度のクランプ
    this.angle = Phaser.Math.Clamp(this.angle, this.minAngle, this.maxAngle);

    this.updateRotation();
    this.drawLaserSight();
  }

  private updateRotation(): void {
    this.barrelContainer.setRotation(this.angle);
  }

  /**
   * 銃口から前方に伸びる照準レーザーサイトを描画
   */
  private drawLaserSight(): void {
    this.laserSight.clear();

    const muzzle = this.getMuzzlePosition();
    const rayLength = 950;
    const endX = muzzle.x + Math.cos(this.angle) * rayLength;
    const endY = muzzle.y + Math.sin(this.angle) * rayLength;

    // ガイドライン（半透明のサイバーブルー破線風）
    this.laserSight.lineStyle(1.5, 0x38bdf8, 0.25);
    this.laserSight.beginPath();
    this.laserSight.moveTo(muzzle.x, muzzle.y);
    this.laserSight.lineTo(endX, endY);
    this.laserSight.strokePath();

    // 銃口の輝き
    this.laserSight.fillStyle(0x38bdf8, 0.4);
    this.laserSight.fillCircle(muzzle.x, muzzle.y, 4);
  }

  /**
   * 発射反動（キックバック）演出
   */
  public playRecoilAnimation(): void {
    this.scene.tweens.killTweensOf(this.barrelContainer);
    // 銃身が後方に少し下がり、すぐ元の位置に戻る
    const backDist = 7;
    const offsetX = -Math.cos(this.angle) * backDist;
    const offsetY = -Math.sin(this.angle) * backDist;

    this.barrelContainer.setPosition(offsetX, offsetY);
    this.scene.tweens.add({
      targets: this.barrelContainer,
      x: 0,
      y: 0,
      duration: 80,
      ease: "Quad.easeOut",
    });

    // マズルフラッシュの瞬間閃光
    const muzzle = this.getMuzzlePosition();
    const flash = this.scene.add.graphics().setDepth(95);
    flash.fillStyle(0xffffff, 0.95);
    flash.fillCircle(muzzle.x, muzzle.y, 10);
    flash.fillStyle(0x38bdf8, 0.8);
    flash.fillCircle(muzzle.x, muzzle.y, 16);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 60,
      onComplete: () => flash.destroy(),
    });
  }

  /**
   * 銃口の世界座標を取得
   */
  public getMuzzlePosition(): { x: number; y: number } {
    return {
      x: this.x + Math.cos(this.angle) * this.barrelLength,
      y: this.y + Math.sin(this.angle) * this.barrelLength,
    };
  }

  public destroy(): void {
    this.laserSight.destroy();
    this.container.destroy();
  }
}
