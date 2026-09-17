import { create } from "zustand";

type ProjectStore = {
    id: string | null;
    name: string | null;
    token: string | null;
    projectName: string | null;
    api_url: string | null;

    setId: (id: string) => void;
    setName: (name: string) => void;
    setToken: (token: string) => void;
    setProjectName: (projectName: string) => void;
    setApi_url: (api_url: string) => void;

    setAll: (data: {
        id?: string;
        name?: string;
        token?: string;
        projectName?: string;
        api_url?:string;
    }) => void;

    clear: () => void;
};

const useProjectInfoStore = create<ProjectStore>((set) => ({
    id: null,
    name: null,
    token: null,
    projectName: null,
    api_url: null,

    setId: (id) => set({ id }),
    setName: (name) => set({ name }),
    setToken: (token) => set({ token }),
    setProjectName: (projectName) => set({ projectName }),
    setApi_url: (api_url) => set({ api_url }),

    setAll: (data) => set((state) => ({ ...state, ...data })),

    clear: () =>
        set({
            id: null,
            name: null,
            token: null,
            projectName: null,
            api_url:null,
        }),
}));

export default useProjectInfoStore;
