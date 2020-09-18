# -*- coding: utf-8 -*-
"""
App - initialize falsk and load the dataset
"""

# Author: Eren Cakmak <eren.cakmak@uni-konstanz.de>
#
# License: MIT

from flask import Flask, render_template

from flask_compress import Compress
from flask_cors import CORS

from api import backend_api
from model import load_data

app = Flask(__name__, static_folder='static', template_folder='static')
CORS(app)

app.config.from_object('config')
app.register_blueprint(backend_api)

comp = Compress(app)


@app.route('/')
def index():
    return render_template('index.html')


if __name__ == "__main__":
    load_data(0)
    app.run(port=8000, debug=True)
