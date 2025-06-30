import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import EditProject from "./EditProjectsModal";
import { toast } from "react-toastify";
import API_BASE_URL from "../apiConfig";

export default function ProjectList({ projects, fetchProjects }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const handleDelete = async (projectId) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You can't revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_BASE_URL}/api/projects/${projectId}`);
        toast.success("Project deleted successfully!");
        fetchProjects();
      } catch (error) {
        toast.error("Failed to delete project.");
        console.error(error);
      }
    }
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedProject(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE_URL}/api/projects/${selectedProject.id}`, selectedProject);
      toast.success("Project updated successfully!");
      closeModal();
      fetchProjects();
    } catch (error) {
      toast.error("Failed to update project.");
      console.error(error);
    }
  };

  return (
    <>
      {projects && projects.length > 0 ? (
        projects.map((project, index) => (
          <tr key={project.id}>
            <td>{index + 1}.</td>
            <td>{project.title}</td>
            <td style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <button style={{ color: "white", cursor: "pointer", backgroundColor: "transparent", outline: "none", border: "none" }} title="edit" onClick={() => handleEdit(project)}>
                <i className="uil uil-edit" />
              </button>
              <button style={{ color: "white", cursor: "pointer", backgroundColor: "transparent", outline: "none", border: "none" }} title="delete" onClick={() => handleDelete(project.id)}>
                <i className="uil uil-trash-alt" />
              </button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="3" style={{ textAlign: 'center' }}>No projects found.</td>
        </tr>
      )}

      {isOpen && <EditProject isOpen={isOpen} closeModal={closeModal} project={selectedProject} onChange={setSelectedProject} handleSubmit={handleSubmit} />}
    </>
  );
}
