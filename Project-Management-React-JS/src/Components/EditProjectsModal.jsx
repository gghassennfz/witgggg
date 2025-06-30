import Modal from "react-modal";

Modal.setAppElement("#root");

export default function EditProject({ isOpen, closeModal, project, onChange, handleSubmit }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...project, [name]: value });
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={closeModal} contentLabel="Edit Project" className="modal" overlayClassName="overlay">
      <h2>Edit Project</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <div className="modal-wrapper">
            <label htmlFor="title">Project Name:</label>
            <input type="text" id="title" name="title" value={project?.title || ""} onChange={handleChange} placeholder="My Awesome Project" required />
            <label htmlFor="description">Description:</label>
            <textarea name="description" id="description" value={project?.description || ""} onChange={handleChange} placeholder="A description of the project..." required />
          </div>
          <div className="modal-wrapper">
            <label htmlFor="repo_url">GitHub Repo URL:</label>
            <input type="text" id="repo_url" name="repo_url" value={project?.repo_url || ""} onChange={handleChange} placeholder="https://github.com/user/repo" />
            <label htmlFor="design_url">Design URL (Figma, etc.):</label>
            <input type="text" id="design_url" name="design_url" value={project?.design_url || ""} onChange={handleChange} placeholder="https://figma.com/file/..." />
          </div>
        </div>
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button className="btn-submit" type="submit">Save Changes</button>
          <button className="btn-submit" type="button" onClick={closeModal} style={{ background: '#555' }}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
