from pathlib import Path
from bs4 import BeautifulSoup

html = Path('example.html').read_text(encoding='utf-8')
soup = BeautifulSoup(html, 'html.parser')

required_classes = {'pt-0', 'md:pt-8', 'pb-8', 'md:pb-12', 'bg-white', 'md:bg-[rgb(251,251,251)]'}

def has_required_classes(tag):
    if tag.name != 'div':
        return False
    classes = set(tag.get('class', []))
    return required_classes.issubset(classes)

container = soup.find(has_required_classes)
print('Found container:', container is not None)
if container:
    Path('example-container.html').write_text(container.prettify(), encoding='utf-8')
    print('Container saved to example-container.html')
else:
    print('Container not found')
