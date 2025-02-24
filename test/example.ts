// Example component with embedded data content
const translations = {
  welcome: "Welcome to our app",
  greeting: "Hello, {name}!",
  submit: "Submit form"
};

function MyComponent() {
  return (
    <div>
      <h1>{t('title', 'Welcome to our website')}</h1>
      <p>{t('description', 'This is a sample component with data content')}</p>
      <button>{t('action.save', 'Save changes')}</button>
    </div>
  );
}
