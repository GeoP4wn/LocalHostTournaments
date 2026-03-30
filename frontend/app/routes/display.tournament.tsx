export const handle = {
  sidebarLinks: [
    { label: "< Back", to: "/" },
    { label: "Display Drafting", to: "/display/draft" },
  ],
};

export default function Display()  {
    return(
        <div>
            <h1>Display the current Tournament</h1>
        </div>
    );
}