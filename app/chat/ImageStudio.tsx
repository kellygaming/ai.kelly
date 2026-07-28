"use client";

export default function ImageStudio() {
  return (
    <div className="studio-panel">
      <div className="studio-result" style={{ width: "100%" }}>
        <div className="studio-blocked">
          <span className="studio-blocked-icon">🚧</span>
          <p>
            La génération de miniatures est momentanément hors service.
            <br />
            On travaille dessus, reviens bientôt !
          </p>
        </div>
      </div>
    </div>
  );
}
