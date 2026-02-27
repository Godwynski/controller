import Controller from './components/Controller';

export const metadata = {
  title: 'PC Controller - Wake-on-LAN',
  description: 'Control your PC over the local network with Wake-on-LAN',
};

export default function Home() {
  return (
    <main>
      <Controller />
    </main>
  );
}
