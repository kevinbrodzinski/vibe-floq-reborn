// import { AppContainer } from "@/components/AppContainer";

const Index = () => {
  console.log('📄 Index CALLED - Component is mounting');
  
  // TEMPORARY: Return a simple div instead of AppContainer to test React rendering
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#00ff00',
      color: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      zIndex: 999999
    }}>
      ✅ INDEX COMPONENT IS RENDERING WITH REACT!
      <br />
      StrictMode disabled, basic React works
    </div>
  );
};

export default Index;
