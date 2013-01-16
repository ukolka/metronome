import webapp2
import jinja2
import os

jinja_environment = jinja2.Environment(
    loader = jinja2.FileSystemLoader(os.path.join(os.path.dirname(__file__),  'templates')))

class MainPage(webapp2.RequestHandler):
  def get(self):
      template = jinja_environment.get_template('index.html')
      self.response.write(template.render())


class NotFound(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.status_int = 404
        self.response.status_message = 'Not found'
        self.response.write('Not Found')

app = webapp2.WSGIApplication([(r'/', MainPage), (r'/.*', NotFound)],
                              debug=True)

def main():
    app.run()

if __name__ == "__main__":
    main()
