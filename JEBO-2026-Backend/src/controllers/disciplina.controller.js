const { HTTP_STATUS } = require('../constants');
const disciplinaService = require('../services/disciplina.service');
const { formatResponse, soloCampos } = require('../utils');
const { NotFoundError } = require('../utils/errors');
const { REGLAMENTOS_DIR } = require('../config/upload');
const path = require('path');
const fs = require('fs');

const CAMPOS_DISCIPLINA = ['nombre', 'jugadores_por_equipo', 'descripcion', 'tipo_competencia'];

class DisciplinaController {
  async findAll(req, res, next) {
    try {
      const data = await disciplinaService.findAll();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await disciplinaService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async uploadReglamento(req, res, next) {
    try {
      const disciplina = await disciplinaService.findById(req.params.id);
      if (!req.file) {
        const error = new Error('No se envió ningún archivo');
        error.status = 400;
        throw error;
      }
      const reglamentoUrl = `/uploads/reglamentos/${req.file.filename}`;
      const updated = await disciplinaService.update(disciplina.id_disciplina, { reglamento: reglamentoUrl });
      res.status(HTTP_STATUS.OK).json(formatResponse(updated, 'Reglamento subido'));
    } catch (err) {
      next(err);
    }
  }

  async downloadReglamento(req, res, next) {
    try {
      const disciplina = await disciplinaService.findById(req.params.id);
      if (!disciplina.reglamento) {
        return next(new NotFoundError('La disciplina no tiene reglamento'));
      }
      const fileName = path.basename(disciplina.reglamento);
      const filePath = path.join(REGLAMENTOS_DIR, fileName);
      if (!fs.existsSync(filePath)) {
        return next(new NotFoundError('Archivo de reglamento no encontrado'));
      }
      res.download(filePath, fileName);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await disciplinaService.create(soloCampos(req, CAMPOS_DISCIPLINA));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Disciplina creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await disciplinaService.update(req.params.id, soloCampos(req, CAMPOS_DISCIPLINA));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Disciplina actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await disciplinaService.delete(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Disciplina eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DisciplinaController();
