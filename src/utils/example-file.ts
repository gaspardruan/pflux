export const files = {
  'main.py': `a=1
class Circle():
  pi = 3.14

  def __init__(self, r, *args, **kwargs):
    self.r = r

  @property
  def get_area(self):
    def add(a, b):
      return a + b
    return self.r**2 * self.pi

  @staticmethod
  def get_pi():
    return Circle.pi
`,
  'add.py': `def add(a, b):
  return a + b`,
};
